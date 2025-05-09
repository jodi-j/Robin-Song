import React, { useState, useEffect, useRef } from "react";
import {SafeAreaView, View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, AccessibilityInfo, findNodeHandle} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import colors from "frontend/assets/theme/colors";
import Card from "../components/Card";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import * as Location from "expo-location";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../database/firebaseConfig";
import { API_BASE_URL } from "../../database/firebaseConfig";

interface BirdData {
 bird: string;
 latitude: number;
 longitude: number;
 timestamp: Date;
}

interface UploadResponse {
 birds: string[];
 message: string;
}

interface BirdInfo {
 description: string;
 at_a_glance: string;
 habitat: string;
 image_url: string;
 feeding_behavior: string;
 diet: string;
 scientific_name: string;
 size?: string;      
 color?: string;     
 wing_shape?: string;
 tail_shape?: string;
 migration_text?: string;
 migration_map_url?: string;
}

const IdentifyScreen: React.FC = () => {
 const [latestBird, setLatestBird] = useState<BirdData | null>(null);
 const [birdInfo, setBirdInfo] = useState<BirdInfo | null>(null);
 const [birdImage, setBirdImage] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [isDetecting, setIsDetecting] = useState(false);
 const [detectionStatus, setDetectionStatus] = useState("Not Identifying Birds");
 const [latitude, setLatitude] = useState<number | null>(null);
 const [longitude, setLongitude] = useState<number | null>(null);
 const recordingRef = useRef<Audio.Recording | null>(null);
 const birdNameRef = useRef(null);

 useEffect(() => {
     const fetchLastBirdFromServer = async () => {
       try {
         const { data } = await axios.get<BirdData[]>(
           `${API_BASE_URL}/my-birds`,
           { withCredentials: true } 
         );
         
         if (data.length > 0) {
           data.sort((a, b) =>
             new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
           );
           const last = data[0];
           setLatestBird({
             bird: last.bird,
             latitude: last.latitude,
             longitude: last.longitude,
             timestamp: new Date(last.timestamp),
           });
           await fetchBirdInfo(last.bird);
         }
       } catch (err) {
         console.error("Error fetching last bird from server:", err);
       }
     };
     fetchLastBirdFromServer();
   }, []);
  

 useEffect(() => {
   const fetchInitialLocation = async () => {
     try {
       let { status } = await Location.requestForegroundPermissionsAsync();
       if (status !== "granted") {
         Alert.alert("Permission required", "Enable location access for detection logs.");
         return;
       }
       let loc = await Location.getCurrentPositionAsync({});
       if (loc?.coords) {
         setLatitude(loc.coords.latitude);
         setLongitude(loc.coords.longitude);
       }
     } catch (err) {
       console.error("Error fetching location:", err);
     }
   };
   fetchInitialLocation();
 }, []);

 useEffect(() => {
  if (latestBird && birdNameRef.current) {
    const birdNode = findNodeHandle(birdNameRef.current);
    if (birdNode) {
      AccessibilityInfo.announceForAccessibility(`New bird identified: ${latestBird.bird}`);
      AccessibilityInfo.setAccessibilityFocus(birdNode);
    }
  }
}, [latestBird]);

 const fetchBirdInfo = async (birdName: string) => {
   setLoading(true);
   try {
     const urlResponse = await axios.get<{ name: string; url: string }>(
       `${API_BASE_URL}/bird-info`,
       { params: { bird: birdName } }
     );
     const birdUrl = urlResponse.data.url;

     const scrapeResponse = await axios.get<BirdInfo>(
       `${API_BASE_URL}/scrape-bird-info`,
       { params: { url: birdUrl } }
     );
     setBirdInfo(scrapeResponse.data);
     setBirdImage(scrapeResponse.data.image_url);
   } catch (error) {
     console.error("Error fetching bird info:", error);
     setBirdInfo(null);
     setBirdImage(null);
   } finally {
     setLoading(false);
   }
 };

 const startRecording = async () => {
   try {
     const { status } = await Audio.requestPermissionsAsync();
     if (status !== "granted") {
       Alert.alert("Permission required", "Enable microphone access in settings.");
       return;
     }
     await Audio.setAudioModeAsync({
       allowsRecordingIOS: true,
       playsInSilentModeIOS: true,
       interruptionModeIOS: InterruptionModeIOS.DoNotMix,
       shouldDuckAndroid: true,
       interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
     });
     const { recording } = await Audio.Recording.createAsync(
       Audio.RecordingOptionsPresets.HIGH_QUALITY
     );
     recordingRef.current = recording;
   } catch (error) {
     console.error("Error starting recording:", error);
   }
 };

 const stopRecordingAndUpload = async () => {
   if (!recordingRef.current) return;
   try {
     await recordingRef.current.stopAndUnloadAsync();
     const uri = recordingRef.current.getURI();
     if (uri) {
       const formData = new FormData();
       formData.append("file", {
         uri,
         name: "recording.wav",
         type: "audio/wav",
       } as any);
       formData.append("latitude", String(latitude ?? 0));
       formData.append("longitude", String(longitude ?? 0));
       const response = await axios.post<UploadResponse>(
         `${API_BASE_URL}/upload`,
         formData,
         { headers: { "Content-Type": "multipart/form-data" }, 
           withCredentials: true
        }
       );
       if (isDetecting && response.data.birds?.length) {
         for (const bird of response.data.birds) {
           console.log(`Detected: ${bird}`);
           setLatestBird({
             bird,
             latitude: latitude ?? 0,
             longitude: longitude ?? 0,
             timestamp: new Date(),
           });
           await fetchBirdInfo(bird);
         }
       }
     }
   } catch (error) {
     console.error("Error uploading audio:", error);
   } finally {
     recordingRef.current = null;
     await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
   }
 };

 useEffect(() => {
   let intervalId: NodeJS.Timeout | null = null;
   const startDetectionCycle = async () => {
     console.log("Detection started.");
     setDetectionStatus("Identifying Birds");
     await startRecording();
     intervalId = setInterval(async () => {
       if (!isDetecting) return;
       await stopRecordingAndUpload();
       if (isDetecting) {
         await startRecording();
       }
     }, 3000);
   };

   if (isDetecting) {
     startDetectionCycle();
   } else {
     console.log("Detection stopped.");
     setDetectionStatus("Not Identifying Birds");
     if (intervalId) clearInterval(intervalId);
     stopRecordingAndUpload();
   }

   return () => {
     if (intervalId) clearInterval(intervalId);
   };
 }, [isDetecting]);

 const toggleDetection = () => {
   setIsDetecting((prev) => !prev);
 };

 return (
   <SafeAreaView style={styles.container}>
     <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View 
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`Bird identification status. ${detectionStatus}.
          Double tap to ${isDetecting ? 'stop' : 'start'} identifying birds.
          ${latestBird ? `Last bird identified on ${latestBird.timestamp.toLocaleString()}` : "No bird detected yet"}.`}
          style={styles.statusContainer}
        >
         <Card style={styles.badge}>
           <Text style={styles.badgeText}>{detectionStatus}</Text>
         </Card>
         <TouchableOpacity style={styles.listeningButton} onPress={toggleDetection}>
           <MaterialCommunityIcons
             name={isDetecting ? "microphone" : "microphone-off"}
             size={36}
             color={colors.card}
           />
         </TouchableOpacity>
         <Card style={styles.badge}>
           <Text style={styles.badgeText}>Bird Last Identified On</Text>
           <Text style={styles.badgeDate}>
             {latestBird ? latestBird.timestamp.toLocaleString() : "No bird detected yet"}
           </Text>
         </Card>
       </View>

       <Text
        ref={birdNameRef}
        accessible={true}
        accessibilityLabel={`Bird identified: ${latestBird ? latestBird.bird : "No bird found yet."}`}
        style={styles.speciesName}
       >
         {latestBird ? latestBird.bird : "No Bird Found Yet"}
       </Text>
       <Text
        accessibilityLabel={`Scientific name: ${birdInfo?.scientific_name}`}
        style={styles.speciesLatin}
       >
         {birdInfo?.scientific_name || ""}
       </Text>


       <View
        accessible={true}
        accessibilityLabel={`Image of ${latestBird?.bird}`}
        style={styles.robinContainer}>
         {loading ? (
           <ActivityIndicator size="large" color={colors.primary} />
         ) : birdImage ? (
           <Image source={{ uri: birdImage }} style={styles.robinImage} />
         ) : (
           <Text style={styles.sectionText}>No image available.</Text>
         )}
       </View>

       <View>
          <Text 
            accessibilityLabel="Physical description"
            accessibilityRole="header"
            style={styles.sectionHeading}
          >
            Description
          </Text>
         <View style={styles.combinedContainer}>
           <Text style={styles.sectionText}>
             {birdInfo?.description || "No description available."}
           </Text>

           {birdInfo?.size && (
            <View
              accessible={true}
              accessibilityLabel={`Size of ${latestBird?.bird}: ${birdInfo.size}`}
              style={styles.iconRow}
            >
              <MaterialCommunityIcons name="ruler-square" size={20} color={colors.secondary} />
              <Text style={styles.iconText}> {birdInfo.size}</Text>
            </View>
           )}

           {birdInfo?.color && (
            <View
              accessible={true}
              accessibilityLabel={`Color of ${latestBird?.bird}: ${birdInfo.color}`}
              style={styles.iconRow}
            >
              <MaterialCommunityIcons name="palette" size={20} color={colors.secondary} />
              <Text style={styles.iconText}> {birdInfo.color}</Text>
            </View>
           )}


           {birdInfo?.wing_shape && (
            <View
              accessible={true}
              accessibilityLabel={`Wing Shape of ${latestBird?.bird}: ${birdInfo.wing_shape}`}
              style={styles.iconRow}
            >
              <MaterialCommunityIcons name="binoculars" size={20} color={colors.secondary} />
              <Text style={styles.iconText}> {birdInfo.wing_shape}</Text>
            </View>
           )}

           {birdInfo?.tail_shape && (
            <View
              accessible={true}
              accessibilityLabel={`Tail Shape of ${latestBird?.bird}: ${birdInfo.tail_shape}`}
              style={styles.iconRow}
            >
               <MaterialCommunityIcons name="tailwind" size={20} color={colors.secondary} />
               <Text style={styles.iconText}> {birdInfo.tail_shape}</Text>
             </View>
           )}
         </View>
       </View>

       <View style={styles.separator} />
       <View>
         <Text accessibilityRole="header" style={styles.sectionHeading}>At a Glance</Text>
         <Text style={styles.sectionText}>
           {birdInfo?.at_a_glance || "No 'At a Glance' information available."}
         </Text>
       </View>
       <View style={styles.separator} />
       <View>
         <Text accessibilityRole="header" style={styles.sectionHeading}>Habitat</Text>
         <Text style={styles.sectionText}>
           {birdInfo?.habitat || "No habitat information available."}
         </Text>
       </View>
       <View style={styles.separator} />
 <Text accessibilityRole="header" style={styles.sectionHeading}>Migration & Range</Text>

 <Text style={styles.sectionText}>
   {birdInfo?.migration_text || "No migration info available."}
 </Text>

 {/* Migration map image */}
  <View
    accessible={true}
    style={styles.robinContainer}
  >
  {loading ? (
    <ActivityIndicator size="large" color={colors.primary} />
  ) : birdInfo?.migration_map_url ? (
    <Image
      source={{ uri: birdInfo.migration_map_url }}
      style={styles.migrationImage}
    />
  ) : (
    <Text style={styles.sectionText}>No migration map available.</Text>
  )}
  </View>

<View style={styles.separator} />
       <View>
         <Text accessibilityRole="header" style={styles.sectionHeading}>Feeding Behavior</Text>
         <Text style={styles.sectionText}>
           {birdInfo?.feeding_behavior || "No feeding info available."}
         </Text>
       </View>
       <View style={styles.separator} />

       <View>
         <Text accessibilityRole="header" style={styles.sectionHeading}>Diet</Text>
         <Text style={styles.sectionText}>
           {birdInfo?.diet || "No diet info available."}
         </Text>
       </View>
       <View style={styles.separator} />
     </ScrollView>
   </SafeAreaView>
 );
};

const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: colors.background,
 },
 scrollContainer: {
   padding: 20,
 },
 migrationImage: {
   width: 300,
   height: 200,
   resizeMode: 'contain',
   marginTop: 10,
 },
 statusContainer: {
   flexDirection: "row",
   alignItems: "center",
   justifyContent: "space-between",
   marginBottom: 20,
 },
 badge: {
   width: "35%",
   height: 110,
   justifyContent: "center",
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 4,
   elevation: 3,
   padding: 0,
 },
 badgeText: {
   fontFamily: "Caprasimo",
   fontSize: 16,
   color: colors.primary,
   textAlign: "center",
 },
 badgeDate: {
   fontFamily: "Radio Canada",
   fontSize: 12,
   color: colors.text,
   textAlign: "center",
 },
 listeningButton: {
   width: 80,
   height: 80,
   borderRadius: 40,
   backgroundColor: colors.accent,
   justifyContent: "center",
   alignItems: "center",
   shadowColor: "#000",
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 4,
   elevation: 5,
 },
 speciesName: {
   fontFamily: "Caprasimo",
   fontSize: 36,
   color: colors.secondary,
   textAlign: "center",
   marginBottom: 5,
 },
 speciesLatin: {
   fontFamily: "Radio Canada Italic",
   fontSize: 20,
   color: colors.text,
   textAlign: "center",
   fontWeight: "bold",
   marginBottom: 20,
 },
 robinContainer: {
   alignItems: "center",
   justifyContent: "center",
   marginBottom: 20,
 },
 robinImage: {
   width: 350,
   height: 250,
   borderRadius: 20,
   borderWidth: 5,
   borderColor: colors.primary,
   shadowColor: colors.black,
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 4,
 },
 sectionText: {
   fontFamily: "Radio Canada",
   fontSize: 16,
   color: colors.text,
   textAlign: "left",
   lineHeight: 24,
 },
 sectionHeading: {
   fontFamily: "Caprasimo",
   fontSize: 28,
   color: colors.secondary,
   textAlign: "center",
   marginBottom: 10,
 },
 separator: {
   height: 2,
   backgroundColor: colors.accent,
   marginVertical: 10,
 },
 combinedContainer: {
   marginTop: 10,
 },
 iconRow: {
   flexDirection: "row",
   alignItems: "center",
   marginTop: 5,
 },
 iconText: {
   fontFamily: "Radio Canada",
   fontSize: 16,
   color: colors.text,
   marginLeft: 5,
   lineHeight: 20,
 },
});

export default IdentifyScreen;