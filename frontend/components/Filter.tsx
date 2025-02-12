import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DropdownComponent from './Dropdown';
import Button from './Button';
import colors from '../assets/theme/colors';

interface Species {
  label: string;
  value: string;
}

interface FilterProps {
  speciesList: Species[];
  onFilterChange: (filterType: string, value: any) => void;
}

type FilterType = 'species' | 'date' | null;

const Filter: React.FC<FilterProps> = ({ speciesList, onFilterChange }) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const handleFilterChange = (value: FilterType) => {
    setSelectedFilter(value);
    setSelectedSpecies(null);
    onFilterChange(value as string, null);
  };

  const handleSpeciesChange = (item: { label: string; value: string | number }) => {
    setSelectedSpecies(String(item.value));
    onFilterChange('species', String(item.value));
  };

  const clearFilters = () => {
    setSelectedFilter(null);
    setSelectedSpecies(null);
    onFilterChange('species', null);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.filterButton} onPress={() => setIsModalVisible(true)}>
        <MaterialCommunityIcons
            name="filter-variant"
            size={20}
            color={colors.chatGPTCardBackground}
            style={styles.filterIcon}
          />
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Options</Text>
              <DropdownComponent
                data={speciesList}
                value={selectedSpecies}
                onChange={handleSpeciesChange}
                placeholder="Filter by Species"
                style={styles.dropdown}
              />

            <Button
              title="Clear Filter"
              onPress={clearFilters}
              variant="secondary"
              textStyle={{fontSize: 16}}
            />

            <Button
              title="Apply"
              onPress={() => setIsModalVisible(false)}
              variant="primary"
              textStyle={{fontSize: 16}}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    marginBottom: 20
  },
  filterButton: { 
    backgroundColor: colors.accent, 
    paddingHorizontal: 14, 
    paddingVertical: 8,
    borderRadius: 50, 
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  filterButtonText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: 'bold',
    fontFamily: 'Radio Canada',
  },
  filterIcon: {
    marginRight: 4,
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  modalContent: { 
    width: '80%', 
    padding: 20, 
    backgroundColor: colors.background, 
    borderRadius: 10 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    fontFamily: 'Radio Canada',
    color: colors.secondary,
    marginBottom: 15,
  },
  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 8,
  },
  dropdown: { 
     marginLeft: 0,
  },
});

export default Filter;
