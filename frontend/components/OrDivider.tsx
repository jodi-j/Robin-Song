import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import colors from '../assets/theme/colors';

const OrDivider = () => {
  return (
    <View
      accessible={true}
      accessibilityLabel='Content divider.'
      style={styles.container}
    >
      <View style={styles.line}/>
      <Text style={styles.text}>or</Text>
      <View style={styles.line}/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  line: {
    height: 2,
    backgroundColor: colors.accent,
    width: '45%',
  },
  text: {
    marginHorizontal: 7,
    color: colors.accent,
    fontFamily: 'Radio Canada',
    fontSize: 18,
  }
});

export default OrDivider;
