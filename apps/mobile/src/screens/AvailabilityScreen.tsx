import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/Theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [availability, setAvailability] = useState([
    { day: 'Monday', available: true, start: '09:00', end: '17:00' },
    { day: 'Tuesday', available: true, start: '09:00', end: '17:00' },
    { day: 'Wednesday', available: true, start: '09:00', end: '17:00' },
    { day: 'Thursday', available: true, start: '09:00', end: '17:00' },
    { day: 'Friday', available: true, start: '09:00', end: '17:00' },
    { day: 'Saturday', available: false, start: '', end: '' },
    { day: 'Sunday', available: false, start: '', end: '' },
  ]);

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await api.get('/scheduling/availability');
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
          // Merge with default structure to ensure all days are present
          const newAvailability = availability.map(dayItem => {
              const found = data.find((d: any) => d.day === dayItem.day);
              if (found) {
                  return { ...dayItem, ...found };
              }
              return { ...dayItem, available: false }; // Default to unavailable if not returned? Or keep default? 
              // Actually backend returns all days if it finds records, or empty array.
              // If backend returns data, it likely only returns what it found.
              // Wait, my backend implementation returns 7 days always if any records exist.
          });
          
          // If data has items, use it.
          // My backend implementation:
          // const uiData = days.map(d => ({ day: d, available: false, start: '', end: '' }));
          // So it returns all 7 days.
          setAvailability(data);
      }
    } catch (error) {
      console.error('Failed to fetch availability', error);
      // Don't alert on 404 or empty, just keep defaults
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailability();
  };

  const toggleAvailability = (index: number) => {
    const newAvailability = [...availability];
    newAvailability[index].available = !newAvailability[index].available;
    // Set default times if turning on and empty
    if (newAvailability[index].available && !newAvailability[index].start) {
        newAvailability[index].start = '09:00';
        newAvailability[index].end = '17:00';
    }
    setAvailability(newAvailability);
  };

  const updateTime = (index: number, field: 'start' | 'end', value: string) => {
    const newAvailability = [...availability];
    newAvailability[index] = { ...newAvailability[index], [field]: value };
    setAvailability(newAvailability);
  };

  const saveChanges = async () => {
      try {
          setSaving(true);
          // Validate times
          const valid = availability.every(item => {
              if (!item.available) return true;
              const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
              if (item.start && !timeRegex.test(item.start)) return false;
              if (item.end && !timeRegex.test(item.end)) return false;
              return true;
          });

          if (!valid) {
              Alert.alert('Invalid Time', 'Please use HH:MM format (e.g. 09:00, 17:30)');
              setSaving(false);
              return;
          }

          await api.post('/scheduling/availability', availability);
          Alert.alert('Success', 'Availability updated successfully');
      } catch (error: any) {
          console.error('Failed to save availability', error);
          Alert.alert('Error', 'Failed to save changes');
      } finally {
          setSaving(false);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Availability</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <Text style={styles.description}>
          Set your standard weekly availability.
        </Text>

        <View style={styles.list}>
          {availability.map((item, index) => (
            <View key={item.day} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.day}>{item.day}</Text>
                <Switch 
                  value={item.available}
                  onValueChange={() => toggleAvailability(index)}
                  trackColor={{ false: '#334155', true: Theme.colors.primary }}
                  thumbColor={'#fff'}
                />
              </View>
              {item.available && (
                <View style={styles.timeContainer}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TextInput
                        style={styles.timeInput}
                        value={item.start}
                        onChangeText={(text) => updateTime(index, 'start', text)}
                        placeholder="09:00"
                        placeholderTextColor={Theme.colors.textSecondary}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                    />
                  </View>
                  <View style={styles.divider}>
                      <Text style={styles.dividerText}>TO</Text>
                  </View>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TextInput
                        style={styles.timeInput}
                        value={item.end}
                        onChangeText={(text) => updateTime(index, 'end', text)}
                        placeholder="17:00"
                        placeholderTextColor={Theme.colors.textSecondary}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={saveChanges}
            disabled={saving}
        >
          {saving ? (
              <ActivityIndicator color="#fff" />
          ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    padding: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    alignItems: 'center',
  },
  headerTitle: {
    ...Theme.typography.h2,
  },
  content: {
    padding: Theme.spacing.m,
  },
  description: {
    ...Theme.typography.body,
    marginBottom: Theme.spacing.l,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
  },
  list: {
    gap: Theme.spacing.m,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.m,
    ...Theme.shadows.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  day: {
    ...Theme.typography.h3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.s,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.s,
  },
  timeBox: {
    flex: 1,
  },
  timeLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeInput: {
      ...Theme.typography.h3,
      color: Theme.colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.primary,
      paddingVertical: 4,
      textAlign: 'center',
  },
  timeValue: {
    ...Theme.typography.h3,
    color: Theme.colors.primary,
  },
  divider: {
    paddingHorizontal: Theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerText: {
      ...Theme.typography.caption,
      color: Theme.colors.textSecondary,
      marginTop: 14,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.m,
    alignItems: 'center',
    marginTop: Theme.spacing.l,
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.glow,
  },
  disabledButton: {
      opacity: 0.7,
  },
  saveButtonText: {
    ...Theme.typography.button,
    color: '#fff',
  },
});