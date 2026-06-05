"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AvailabilityScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const Theme_1 = require("../constants/Theme");
const AuthContext_1 = require("../context/AuthContext");
const api_1 = __importDefault(require("../services/api"));
function AvailabilityScreen() {
    const { user } = (0, AuthContext_1.useAuth)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [availability, setAvailability] = (0, react_1.useState)([
        { day: 'Monday', available: true, start: '09:00', end: '17:00' },
        { day: 'Tuesday', available: true, start: '09:00', end: '17:00' },
        { day: 'Wednesday', available: true, start: '09:00', end: '17:00' },
        { day: 'Thursday', available: true, start: '09:00', end: '17:00' },
        { day: 'Friday', available: true, start: '09:00', end: '17:00' },
        { day: 'Saturday', available: false, start: '', end: '' },
        { day: 'Sunday', available: false, start: '', end: '' },
    ]);
    const fetchAvailability = (0, react_1.useCallback)(async () => {
        try {
            const response = await api_1.default.get('/scheduling/availability');
            const data = response.data;
            if (Array.isArray(data) && data.length > 0) {
                // Merge with default structure to ensure all days are present
                const newAvailability = availability.map(dayItem => {
                    const found = data.find((d) => d.day === dayItem.day);
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
        }
        catch (error) {
            console.error('Failed to fetch availability', error);
            // Don't alert on 404 or empty, just keep defaults
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchAvailability();
    }, [fetchAvailability]);
    const onRefresh = () => {
        setRefreshing(true);
        fetchAvailability();
    };
    const toggleAvailability = (index) => {
        const newAvailability = [...availability];
        newAvailability[index].available = !newAvailability[index].available;
        // Set default times if turning on and empty
        if (newAvailability[index].available && !newAvailability[index].start) {
            newAvailability[index].start = '09:00';
            newAvailability[index].end = '17:00';
        }
        setAvailability(newAvailability);
    };
    const updateTime = (index, field, value) => {
        const newAvailability = [...availability];
        newAvailability[index] = { ...newAvailability[index], [field]: value };
        setAvailability(newAvailability);
    };
    const saveChanges = async () => {
        try {
            setSaving(true);
            // Validate times
            const valid = availability.every(item => {
                if (!item.available)
                    return true;
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (item.start && !timeRegex.test(item.start))
                    return false;
                if (item.end && !timeRegex.test(item.end))
                    return false;
                return true;
            });
            if (!valid) {
                react_native_1.Alert.alert('Invalid Time', 'Please use HH:MM format (e.g. 09:00, 17:30)');
                setSaving(false);
                return;
            }
            await api_1.default.post('/scheduling/availability', availability);
            react_native_1.Alert.alert('Success', 'Availability updated successfully');
        }
        catch (error) {
            console.error('Failed to save availability', error);
            react_native_1.Alert.alert('Error', 'Failed to save changes');
        }
        finally {
            setSaving(false);
        }
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.headerTitle}>Availability</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme_1.Theme.colors.primary}/>}>
        <react_native_1.Text style={styles.description}>
          Set your standard weekly availability.
        </react_native_1.Text>

        <react_native_1.View style={styles.list}>
          {availability.map((item, index) => (<react_native_1.View key={item.day} style={styles.card}>
              <react_native_1.View style={styles.cardHeader}>
                <react_native_1.Text style={styles.day}>{item.day}</react_native_1.Text>
                <react_native_1.Switch value={item.available} onValueChange={() => toggleAvailability(index)} trackColor={{ false: '#334155', true: Theme_1.Theme.colors.primary }} thumbColor={'#fff'}/>
              </react_native_1.View>
              {item.available && (<react_native_1.View style={styles.timeContainer}>
                  <react_native_1.View style={styles.timeBox}>
                    <react_native_1.Text style={styles.timeLabel}>Start</react_native_1.Text>
                    <react_native_1.TextInput style={styles.timeInput} value={item.start} onChangeText={(text) => updateTime(index, 'start', text)} placeholder="09:00" placeholderTextColor={Theme_1.Theme.colors.textSecondary} keyboardType="numbers-and-punctuation" maxLength={5}/>
                  </react_native_1.View>
                  <react_native_1.View style={styles.divider}>
                      <react_native_1.Text style={styles.dividerText}>TO</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={styles.timeBox}>
                    <react_native_1.Text style={styles.timeLabel}>End</react_native_1.Text>
                    <react_native_1.TextInput style={styles.timeInput} value={item.end} onChangeText={(text) => updateTime(index, 'end', text)} placeholder="17:00" placeholderTextColor={Theme_1.Theme.colors.textSecondary} keyboardType="numbers-and-punctuation" maxLength={5}/>
                  </react_native_1.View>
                </react_native_1.View>)}
            </react_native_1.View>))}
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={saveChanges} disabled={saving}>
          {saving ? (<react_native_1.ActivityIndicator color="#fff"/>) : (<react_native_1.Text style={styles.saveButtonText}>Save Changes</react_native_1.Text>)}
        </react_native_1.TouchableOpacity>
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme_1.Theme.colors.background,
    },
    header: {
        padding: Theme_1.Theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: Theme_1.Theme.colors.border,
        alignItems: 'center',
    },
    headerTitle: {
        ...Theme_1.Theme.typography.h2,
    },
    content: {
        padding: Theme_1.Theme.spacing.m,
    },
    description: {
        ...Theme_1.Theme.typography.body,
        marginBottom: Theme_1.Theme.spacing.l,
        textAlign: 'center',
        color: Theme_1.Theme.colors.textSecondary,
    },
    list: {
        gap: Theme_1.Theme.spacing.m,
    },
    card: {
        backgroundColor: Theme_1.Theme.colors.surface,
        padding: Theme_1.Theme.spacing.m,
        borderRadius: Theme_1.Theme.borderRadius.m,
        ...Theme_1.Theme.shadows.card,
        borderWidth: 1,
        borderColor: Theme_1.Theme.colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme_1.Theme.spacing.s,
    },
    day: {
        ...Theme_1.Theme.typography.h3,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Theme_1.Theme.spacing.s,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: Theme_1.Theme.spacing.s,
        borderRadius: Theme_1.Theme.borderRadius.s,
    },
    timeBox: {
        flex: 1,
    },
    timeLabel: {
        ...Theme_1.Theme.typography.caption,
        color: Theme_1.Theme.colors.textSecondary,
        marginBottom: 4,
    },
    timeInput: {
        ...Theme_1.Theme.typography.h3,
        color: Theme_1.Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme_1.Theme.colors.primary,
        paddingVertical: 4,
        textAlign: 'center',
    },
    timeValue: {
        ...Theme_1.Theme.typography.h3,
        color: Theme_1.Theme.colors.primary,
    },
    divider: {
        paddingHorizontal: Theme_1.Theme.spacing.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dividerText: {
        ...Theme_1.Theme.typography.caption,
        color: Theme_1.Theme.colors.textSecondary,
        marginTop: 14,
    },
    saveButton: {
        backgroundColor: Theme_1.Theme.colors.primary,
        padding: Theme_1.Theme.spacing.m,
        borderRadius: Theme_1.Theme.borderRadius.m,
        alignItems: 'center',
        marginTop: Theme_1.Theme.spacing.l,
        marginBottom: Theme_1.Theme.spacing.xl,
        ...Theme_1.Theme.shadows.glow,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        ...Theme_1.Theme.typography.button,
        color: '#fff',
    },
});
