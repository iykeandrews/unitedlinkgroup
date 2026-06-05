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
exports.default = ProfileScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const AuthContext_1 = require("../context/AuthContext");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const NavigationService_1 = require("../navigation/NavigationService");
const expo_constants_1 = __importDefault(require("expo-constants"));
const Location = __importStar(require("expo-location"));
const ImagePicker = __importStar(require("expo-image-picker"));
const api_1 = __importDefault(require("../services/api"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const native_1 = require("@react-navigation/native");
const DocumentPicker = __importStar(require("expo-document-picker"));
const datetimepicker_1 = __importDefault(require("@react-native-community/datetimepicker"));
function ProfileScreen() {
    const { user, designation, signOut, clearSavedSession, biometricAvailable, biometricEnabled, savedSessionAvailable } = (0, AuthContext_1.useAuth)();
    const [checking, setChecking] = (0, react_1.useState)(false);
    const [locationPermission, setLocationPermission] = (0, react_1.useState)('UNKNOWN');
    const [locationServices, setLocationServices] = (0, react_1.useState)('UNKNOWN');
    const [employee, setEmployee] = (0, react_1.useState)(null);
    const [savingProfile, setSavingProfile] = (0, react_1.useState)(false);
    const [authToken, setAuthToken] = (0, react_1.useState)(null);
    const [qualifications, setQualifications] = (0, react_1.useState)([]);
    const [qualLoading, setQualLoading] = (0, react_1.useState)(false);
    const [showQualModal, setShowQualModal] = (0, react_1.useState)(false);
    const [editingQualId, setEditingQualId] = (0, react_1.useState)(null);
    const [qualName, setQualName] = (0, react_1.useState)('');
    const [qualType, setQualType] = (0, react_1.useState)('CERTIFICATION');
    const [issuingOrganization, setIssuingOrganization] = (0, react_1.useState)('');
    const [credentialId, setCredentialId] = (0, react_1.useState)('');
    const [issueDate, setIssueDate] = (0, react_1.useState)(null);
    const [expiryDate, setExpiryDate] = (0, react_1.useState)(null);
    const [qualFileUrl, setQualFileUrl] = (0, react_1.useState)(null);
    const [qualFileName, setQualFileName] = (0, react_1.useState)(null);
    const [savingQual, setSavingQual] = (0, react_1.useState)(false);
    const [showQualView, setShowQualView] = (0, react_1.useState)(false);
    const [viewQualName, setViewQualName] = (0, react_1.useState)('');
    const [viewQualType, setViewQualType] = (0, react_1.useState)('CERTIFICATION');
    const [viewQualFileUrl, setViewQualFileUrl] = (0, react_1.useState)(null);
    const [viewQualFileName, setViewQualFileName] = (0, react_1.useState)(null);
    const [showQualList, setShowQualList] = (0, react_1.useState)(false);
    const [showBioModal, setShowBioModal] = (0, react_1.useState)(false);
    const [bioPronouns, setBioPronouns] = (0, react_1.useState)('');
    const [bioPhone, setBioPhone] = (0, react_1.useState)('');
    const [bioAddress, setBioAddress] = (0, react_1.useState)('');
    const [bioCity, setBioCity] = (0, react_1.useState)('');
    const [bioState, setBioState] = (0, react_1.useState)('');
    const [bioZip, setBioZip] = (0, react_1.useState)('');
    const [bioCountry, setBioCountry] = (0, react_1.useState)('');
    const [bioDob, setBioDob] = (0, react_1.useState)(null);
    const [bioEmergencyName, setBioEmergencyName] = (0, react_1.useState)('');
    const [bioEmergencyPhone, setBioEmergencyPhone] = (0, react_1.useState)('');
    const [savingBio, setSavingBio] = (0, react_1.useState)(false);
    const [datePickerKind, setDatePickerKind] = (0, react_1.useState)(null);
    const [datePickerValue, setDatePickerValue] = (0, react_1.useState)(new Date());
    const palette = (0, react_1.useMemo)(() => ({
        bg: '#050816',
        panel: 'rgba(255,255,255,0.08)',
        panelStrong: 'rgba(255,255,255,0.11)',
        border: 'rgba(255,255,255,0.14)',
        text: '#E8EEF9',
        muted: 'rgba(232,238,249,0.70)',
        faint: 'rgba(232,238,249,0.48)',
        faint2: 'rgba(232,238,249,0.34)',
        indigo: '#4F46E5',
        cyan: '#22D3EE',
        green: '#34D399',
        amber: '#FBBF24',
        red: '#FB7185',
    }), []);
    const refreshLocationState = (0, react_1.useCallback)(async () => {
        try {
            setChecking(true);
            const perm = await Location.getForegroundPermissionsAsync();
            setLocationPermission((perm === null || perm === void 0 ? void 0 : perm.granted) ? 'GRANTED' : 'DENIED');
            const enabled = await Location.hasServicesEnabledAsync();
            setLocationServices(enabled ? 'ON' : 'OFF');
        }
        catch {
            setLocationPermission('UNKNOWN');
            setLocationServices('UNKNOWN');
        }
        finally {
            setChecking(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        refreshLocationState();
    }, [refreshLocationState]);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        (async () => {
            const t = await async_storage_1.default.getItem('token');
            if (!cancelled)
                setAuthToken(t);
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    const getAuthedUrl = (0, react_1.useCallback)((path) => {
        const base = String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
        const p = String(path || '');
        const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
        if (!authToken)
            return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(authToken)}`;
    }, [authToken]);
    const fetchEmployee = (0, react_1.useCallback)(async () => {
        try {
            const res = await api_1.default.get('/employees/me');
            setEmployee(res.data);
        }
        catch {
            setEmployee(null);
        }
    }, []);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        fetchEmployee();
    }, [fetchEmployee]));
    const fetchQualifications = (0, react_1.useCallback)(async () => {
        try {
            setQualLoading(true);
            const res = await api_1.default.get('/employees/me/qualifications');
            const list = (res.data || []).filter((q) => ['CERTIFICATION', 'LICENSE'].includes(String((q === null || q === void 0 ? void 0 : q.type) || '').toUpperCase()));
            setQualifications(list);
        }
        catch {
            setQualifications([]);
        }
        finally {
            setQualLoading(false);
        }
    }, []);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        fetchQualifications();
    }, [fetchQualifications]));
    const name = (0, react_1.useMemo)(() => {
        const first = String((employee === null || employee === void 0 ? void 0 : employee.firstName) || (user === null || user === void 0 ? void 0 : user.firstName) || '').trim();
        const last = String((employee === null || employee === void 0 ? void 0 : employee.lastName) || (user === null || user === void 0 ? void 0 : user.lastName) || '').trim();
        const full = `${first} ${last}`.trim();
        return full || 'User';
    }, [employee === null || employee === void 0 ? void 0 : employee.firstName, employee === null || employee === void 0 ? void 0 : employee.lastName, user === null || user === void 0 ? void 0 : user.firstName, user === null || user === void 0 ? void 0 : user.lastName]);
    const initials = (0, react_1.useMemo)(() => {
        var _a, _b;
        const parts = name.split(' ').filter(Boolean);
        const a = ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a[0]) || 'U';
        const b = ((_b = parts[1]) === null || _b === void 0 ? void 0 : _b[0]) || '';
        return `${a}${b}`.toUpperCase();
    }, [name]);
    const qualSorted = (0, react_1.useMemo)(() => {
        const list = (qualifications || []).slice();
        list.sort((a, b) => {
            const ad = (a === null || a === void 0 ? void 0 : a.expiryDate) ? new Date(a.expiryDate).getTime() : 0;
            const bd = (b === null || b === void 0 ? void 0 : b.expiryDate) ? new Date(b.expiryDate).getTime() : 0;
            if (ad && bd)
                return ad - bd;
            if (ad)
                return -1;
            if (bd)
                return 1;
            return String((a === null || a === void 0 ? void 0 : a.name) || '').localeCompare(String((b === null || b === void 0 ? void 0 : b.name) || ''));
        });
        return list;
    }, [qualifications]);
    const appVersion = (0, react_1.useMemo)(() => {
        var _a, _b, _c, _d, _e, _f;
        const v = ((_a = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.version) || ((_b = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.manifest) === null || _b === void 0 ? void 0 : _b.version) || '';
        const build = ((_d = (_c = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _c === void 0 ? void 0 : _c.ios) === null || _d === void 0 ? void 0 : _d.buildNumber) || ((_f = (_e = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _e === void 0 ? void 0 : _e.android) === null || _f === void 0 ? void 0 : _f.versionCode) || '';
        return [v, build ? `(${build})` : ''].filter(Boolean).join(' ');
    }, []);
    const profileImageUrl = (employee === null || employee === void 0 ? void 0 : employee.profileImageUrl) ? getAuthedUrl(employee.profileImageUrl) : null;
    const openQualView = (0, react_1.useCallback)((input) => {
        const fileUrl = input.fileUrl ? String(input.fileUrl) : '';
        if (!fileUrl)
            return;
        setViewQualName(String(input.name || 'Document'));
        setViewQualType(String(input.type || 'CERTIFICATION').toUpperCase() === 'LICENSE' ? 'LICENSE' : 'CERTIFICATION');
        setViewQualFileUrl(fileUrl);
        setViewQualFileName(input.fileName ? String(input.fileName) : null);
        setShowQualView(true);
    }, []);
    const updateProfilePhoto = async () => {
        var _a, _b, _c, _d;
        if (savingProfile)
            return;
        try {
            setSavingProfile(true);
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
                react_native_1.Alert.alert('Profile photo', 'Photo permission is required to pick an image.');
                return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.85,
                allowsEditing: true,
                aspect: [1, 1],
                selectionLimit: 1,
            });
            if (res.canceled)
                return;
            const asset = (_a = res.assets) === null || _a === void 0 ? void 0 : _a[0];
            if (!(asset === null || asset === void 0 ? void 0 : asset.uri))
                return;
            const mimeType = String(asset.mimeType || 'image/jpeg');
            const fileName = String(asset.fileName || `profile-${Date.now()}.jpg`);
            const form = new FormData();
            form.append('file', { uri: asset.uri, name: fileName, type: mimeType });
            const up = await api_1.default.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            const url = (_b = up.data) === null || _b === void 0 ? void 0 : _b.url;
            if (!url) {
                react_native_1.Alert.alert('Profile photo', 'Upload failed.');
                return;
            }
            await api_1.default.patch('/employees/me/profile-image', { url });
            await fetchEmployee();
            react_native_1.Alert.alert('Profile photo', 'Updated.');
        }
        catch (e) {
            react_native_1.Alert.alert('Profile photo', String(((_d = (_c = e === null || e === void 0 ? void 0 : e.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to update photo'));
        }
        finally {
            setSavingProfile(false);
        }
    };
    const hydrateBioForm = (0, react_1.useCallback)(() => {
        const e = employee || {};
        setBioPronouns(String(e.pronouns || ''));
        setBioPhone(String(e.phone || ''));
        setBioAddress(String(e.address || ''));
        setBioCity(String(e.city || ''));
        setBioState(String(e.state || ''));
        setBioZip(String(e.zip || ''));
        setBioCountry(String(e.country || ''));
        setBioDob(e.dateOfBirth ? new Date(e.dateOfBirth) : null);
        setBioEmergencyName(String(e.emergencyContactName || ''));
        setBioEmergencyPhone(String(e.emergencyContactPhone || ''));
    }, [employee]);
    const openBioModal = () => {
        hydrateBioForm();
        setShowBioModal(true);
    };
    const openDobPicker = () => {
        setDatePickerValue(bioDob || new Date());
        setDatePickerKind('DOB');
    };
    const saveBio = async () => {
        var _a, _b;
        if (savingBio)
            return;
        try {
            setSavingBio(true);
            await api_1.default.patch('/employees/me/bio', {
                pronouns: bioPronouns.trim() || null,
                phone: bioPhone.trim() || null,
                address: bioAddress.trim() || null,
                city: bioCity.trim() || null,
                state: bioState.trim() || null,
                zip: bioZip.trim() || null,
                country: bioCountry.trim() || null,
                dateOfBirth: bioDob ? bioDob.toISOString() : null,
                emergencyContactName: bioEmergencyName.trim() || null,
                emergencyContactPhone: bioEmergencyPhone.trim() || null,
            });
            setShowBioModal(false);
            await fetchEmployee();
            react_native_1.Alert.alert('Bio data', 'Updated.');
        }
        catch (e) {
            react_native_1.Alert.alert('Bio data', String(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to update'));
        }
        finally {
            setSavingBio(false);
        }
    };
    const resetQualForm = () => {
        setEditingQualId(null);
        setQualName('');
        setQualType('CERTIFICATION');
        setIssuingOrganization('');
        setCredentialId('');
        setIssueDate(null);
        setExpiryDate(null);
        setQualFileUrl(null);
        setQualFileName(null);
    };
    const openAddQualification = () => {
        resetQualForm();
        setShowQualModal(true);
    };
    const openEditQualification = (q) => {
        setEditingQualId(String((q === null || q === void 0 ? void 0 : q.id) || ''));
        setQualName(String((q === null || q === void 0 ? void 0 : q.name) || ''));
        setQualType(String((q === null || q === void 0 ? void 0 : q.type) || 'CERTIFICATION').toUpperCase() === 'LICENSE' ? 'LICENSE' : 'CERTIFICATION');
        setIssuingOrganization(String((q === null || q === void 0 ? void 0 : q.issuingOrganization) || ''));
        setCredentialId(String((q === null || q === void 0 ? void 0 : q.credentialId) || ''));
        setIssueDate((q === null || q === void 0 ? void 0 : q.issueDate) ? new Date(q.issueDate) : null);
        setExpiryDate((q === null || q === void 0 ? void 0 : q.expiryDate) ? new Date(q.expiryDate) : null);
        setQualFileUrl((q === null || q === void 0 ? void 0 : q.fileUrl) ? String(q.fileUrl) : null);
        setQualFileName((q === null || q === void 0 ? void 0 : q.fileUrl) ? String(q.fileUrl).split('/').pop() || null : null);
        setShowQualModal(true);
    };
    const openDate = (kind) => {
        const current = kind === 'ISSUE' ? issueDate : expiryDate;
        setDatePickerValue(current || new Date());
        setDatePickerKind(kind);
    };
    const uploadQualificationFile = async (file) => {
        var _a;
        const form = new FormData();
        form.append('file', { uri: file.uri, name: file.name, type: file.mimeType });
        const isImage = file.mimeType.startsWith('image/');
        const endpoint = isImage ? '/uploads/images' : '/uploads';
        const res = await api_1.default.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        return String(((_a = res.data) === null || _a === void 0 ? void 0 : _a.url) || '');
    };
    const pickQualPhoto = async () => {
        var _a, _b, _c;
        if (savingQual)
            return;
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
            react_native_1.Alert.alert('Upload', 'Photo permission is required.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
            allowsEditing: false,
            selectionLimit: 1,
        });
        if (res.canceled)
            return;
        const asset = (_a = res.assets) === null || _a === void 0 ? void 0 : _a[0];
        if (!(asset === null || asset === void 0 ? void 0 : asset.uri))
            return;
        const mimeType = String(asset.mimeType || 'image/jpeg');
        const fileName = String(asset.fileName || `qualification-${Date.now()}.jpg`);
        try {
            setSavingQual(true);
            const url = await uploadQualificationFile({ uri: asset.uri, name: fileName, mimeType });
            if (!url)
                throw new Error('Upload failed');
            setQualFileUrl(url);
            setQualFileName(fileName);
        }
        catch (e) {
            react_native_1.Alert.alert('Upload', String(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to upload'));
        }
        finally {
            setSavingQual(false);
        }
    };
    const pickQualFile = async () => {
        var _a, _b, _c;
        if (savingQual)
            return;
        const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
        if (res.canceled)
            return;
        const file = (_a = res.assets) === null || _a === void 0 ? void 0 : _a[0];
        if (!(file === null || file === void 0 ? void 0 : file.uri))
            return;
        const mimeType = String(file.mimeType || 'application/octet-stream');
        const name = String(file.name || `qualification-${Date.now()}`);
        try {
            setSavingQual(true);
            const url = await uploadQualificationFile({ uri: file.uri, name, mimeType });
            if (!url)
                throw new Error('Upload failed');
            setQualFileUrl(url);
            setQualFileName(name);
        }
        catch (e) {
            react_native_1.Alert.alert('Upload', String(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to upload'));
        }
        finally {
            setSavingQual(false);
        }
    };
    const saveQualification = async () => {
        var _a, _b;
        if (savingQual)
            return;
        const name = qualName.trim();
        if (!name) {
            react_native_1.Alert.alert('Qualification', 'Name is required.');
            return;
        }
        try {
            setSavingQual(true);
            const payload = {
                name,
                type: qualType,
                issuingOrganization: issuingOrganization.trim() || undefined,
                credentialId: credentialId.trim() || undefined,
                issueDate: issueDate ? issueDate.toISOString() : undefined,
                expiryDate: expiryDate ? expiryDate.toISOString() : undefined,
                fileUrl: qualFileUrl || undefined,
            };
            if (editingQualId) {
                await api_1.default.patch(`/employees/me/qualifications/${editingQualId}`, payload);
            }
            else {
                await api_1.default.post('/employees/me/qualifications', payload);
            }
            setShowQualModal(false);
            resetQualForm();
            await fetchQualifications();
            react_native_1.Alert.alert('Qualification', 'Saved.');
        }
        catch (e) {
            react_native_1.Alert.alert('Qualification', String(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to save'));
        }
        finally {
            setSavingQual(false);
        }
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 220, right: -210, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={styles.content}>
        <react_native_1.View style={styles.header}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]}>Profile</react_native_1.Text>
          <react_native_1.TouchableOpacity style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => (0, NavigationService_1.navigate)('Settings')}>
            <vector_icons_1.Ionicons name="settings-outline" size={18} color={palette.text}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.hero, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.heroTopRow}>
            <react_native_1.TouchableOpacity style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={updateProfilePhoto} disabled={savingProfile} activeOpacity={0.85}>
              {profileImageUrl ? (<react_native_1.Image source={{ uri: profileImageUrl }} style={styles.avatarImg}/>) : (<react_native_1.Text style={[styles.avatarText, { color: palette.text }]}>{initials}</react_native_1.Text>)}
              <react_native_1.View style={[styles.avatarEdit, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                {savingProfile ? (<react_native_1.ActivityIndicator size="small" color={palette.cyan}/>) : (<vector_icons_1.Ionicons name="camera-outline" size={16} color={palette.text}/>)}
              </react_native_1.View>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                {name}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.email, { color: palette.muted }]} numberOfLines={1}>
                {(user === null || user === void 0 ? void 0 : user.email) || ' '}
              </react_native_1.Text>
              <react_native_1.View style={[styles.rolePill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="briefcase-outline" size={14} color={palette.cyan}/>
                <react_native_1.Text style={[styles.roleText, { color: palette.text }]}>{designation || 'User'}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.heroActions}>
            <react_native_1.TouchableOpacity style={[styles.actionBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => (0, NavigationService_1.navigate)('Availability')}>
              <vector_icons_1.Ionicons name="time-outline" size={16} color={palette.text}/>
              <react_native_1.Text style={[styles.actionText, { color: palette.text }]}>Availability</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={[styles.actionBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={refreshLocationState} disabled={checking}>
              <vector_icons_1.Ionicons name="refresh" size={16} color={palette.text}/>
              <react_native_1.Text style={[styles.actionText, { color: palette.text }]}>{checking ? 'Checking…' : 'Refresh'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeaderWrap}>
            <react_native_1.View style={styles.sectionHeaderRow}>
              <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(34,211,238,0.16)', borderColor: palette.border }]}>
                <vector_icons_1.Ionicons name="ribbon-outline" size={18} color={palette.cyan}/>
              </react_native_1.View>
              <react_native_1.View style={styles.sectionTitleWrap}>
                <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]} numberOfLines={2}>
                  Certifications &{'\n'}Licenses
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setShowQualList(true)} disabled={qualLoading || qualSorted.length === 0}>
                <vector_icons_1.Ionicons name="eye-outline" size={18} color={(qualLoading || qualSorted.length === 0 ? palette.faint2 : palette.text)}/>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={openAddQualification}>
                <vector_icons_1.Ionicons name="add" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: qualLoading ? 0.75 : 1 }]}>
            <vector_icons_1.Ionicons name="folder-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>
                {qualLoading ? 'Loading documents…' : `${qualSorted.length} document${qualSorted.length === 1 ? '' : 's'} uploaded`}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Tap the eye icon to view the list.</react_native_1.Text>
            </react_native_1.View>
            {qualLoading ? <react_native_1.ActivityIndicator color={palette.cyan}/> : null}
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(79,70,229,0.18)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="id-card-outline" size={18} color={palette.indigo}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Bio data</react_native_1.Text>
            <react_native_1.View style={{ flex: 1 }}/>
            <react_native_1.TouchableOpacity style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={openBioModal}>
              <vector_icons_1.Ionicons name="create-outline" size={18} color={palette.text}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <vector_icons_1.Ionicons name="information-circle-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Tap edit to update your bio data</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Phone, address, DOB, emergency contact, and more.</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(251,113,133,0.12)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="shield-outline" size={18} color={palette.red}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Account</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={async () => {
            try {
                await signOut();
            }
            catch (e) {
                react_native_1.Alert.alert('Lock', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to lock the app'));
            }
        }}>
            <vector_icons_1.Ionicons name="lock-closed-outline" size={18} color={palette.cyan}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Lock app</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>
                {biometricEnabled ? 'Unlock with biometrics.' : 'Return to login screen.'}
              </react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]} onPress={() => {
            react_native_1.Alert.alert('Sign out', 'This will remove your saved session from this device.', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearSavedSession();
                        }
                        catch (e) {
                            react_native_1.Alert.alert('Sign out', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to sign out'));
                        }
                    },
                },
            ]);
        }}>
            <vector_icons_1.Ionicons name="log-out-outline" size={18} color={palette.red}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Sign out (remove session)</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Clears token and biometric setting.</react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(251,191,36,0.14)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="information-circle-outline" size={18} color={palette.amber}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>About</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <react_native_1.Text style={[styles.aboutLabel, { color: palette.muted }]}>Version</react_native_1.Text>
            <react_native_1.Text style={[styles.aboutValue, { color: palette.text }]}>{appVersion || ' '}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.bottomPad}/>
      </react_native_1.ScrollView>

      <react_native_1.Modal visible={showQualModal} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>{editingQualId ? 'Update' : 'Add'} qualification</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => {
            setShowQualModal(false);
            resetQualForm();
        }} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.ScrollView contentContainerStyle={styles.modalBody}>
              <react_native_1.View style={styles.twoCol}>
                <react_native_1.TouchableOpacity style={[
            styles.pillChoice,
            { borderColor: palette.border, backgroundColor: qualType === 'CERTIFICATION' ? palette.indigo : palette.panelStrong },
        ]} onPress={() => setQualType('CERTIFICATION')}>
                  <react_native_1.Text style={[styles.pillChoiceText, { color: '#ffffff' }]}>Certification</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[
            styles.pillChoice,
            { borderColor: palette.border, backgroundColor: qualType === 'LICENSE' ? palette.indigo : palette.panelStrong },
        ]} onPress={() => setQualType('LICENSE')}>
                  <react_native_1.Text style={[styles.pillChoiceText, { color: '#ffffff' }]}>License</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="text-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={qualName} onChangeText={setQualName} placeholder="Name" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>

              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="business-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={issuingOrganization} onChangeText={setIssuingOrganization} placeholder="Issuing organization (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>

              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="pricetag-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={credentialId} onChangeText={setCredentialId} placeholder="Credential ID (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.TouchableOpacity style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openDate('ISSUE')} activeOpacity={0.85}>
                  <vector_icons_1.Ionicons name="calendar-outline" size={18} color={palette.muted}/>
                  <react_native_1.Text style={[styles.input, { color: issueDate ? palette.text : palette.faint }]} numberOfLines={1}>
                    {issueDate ? issueDate.toLocaleDateString() : 'Issue date'}
                  </react_native_1.Text>
                  <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint2}/>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openDate('EXPIRY')} activeOpacity={0.85}>
                  <vector_icons_1.Ionicons name="calendar-clear-outline" size={18} color={palette.muted}/>
                  <react_native_1.Text style={[styles.input, { color: expiryDate ? palette.text : palette.faint }]} numberOfLines={1}>
                    {expiryDate ? expiryDate.toLocaleDateString() : 'Expiry date'}
                  </react_native_1.Text>
                  <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint2}/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: savingQual ? 0.7 : 1 }]} onPress={pickQualPhoto} disabled={savingQual}>
                  <vector_icons_1.Ionicons name="image-outline" size={16} color={palette.text}/>
                  <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Photo</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: savingQual ? 0.7 : 1 }]} onPress={pickQualFile} disabled={savingQual}>
                  <vector_icons_1.Ionicons name="document-outline" size={16} color={palette.text}/>
                  <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>File</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              {qualFileUrl ? (<react_native_1.View style={styles.twoCol}>
                  <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openQualView({ name: qualName, type: qualType, fileUrl: qualFileUrl, fileName: qualFileName })}>
                    <vector_icons_1.Ionicons name="eye-outline" size={16} color={palette.text}/>
                    <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>View</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => {
                setQualFileUrl(null);
                setQualFileName(null);
            }}>
                    <vector_icons_1.Ionicons name="trash-outline" size={16} color={palette.red}/>
                    <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Remove</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>) : null}

              <react_native_1.View style={styles.modalActions}>
                <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => {
            setShowQualModal(false);
            resetQualForm();
        }} disabled={savingQual}>
                  <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: savingQual ? 0.7 : 1 }]} onPress={saveQualification} disabled={savingQual}>
                  {savingQual ? <react_native_1.ActivityIndicator color="#ffffff"/> : <react_native_1.Text style={styles.primaryBtnText}>Save</react_native_1.Text>}
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={showBioModal} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Update bio data</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setShowBioModal(false)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.ScrollView contentContainerStyle={styles.modalBody}>
              <react_native_1.View style={styles.twoCol}>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioPronouns} onChangeText={setBioPronouns} placeholder="Pronouns (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
                <react_native_1.TouchableOpacity style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={openDobPicker} activeOpacity={0.85}>
                  <vector_icons_1.Ionicons name="calendar-outline" size={18} color={palette.muted}/>
                  <react_native_1.Text style={[styles.input, { color: bioDob ? palette.text : palette.faint }]} numberOfLines={1}>
                    {bioDob ? bioDob.toLocaleDateString() : 'Date of birth (optional)'}
                  </react_native_1.Text>
                  <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint2}/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="call-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioPhone} onChangeText={setBioPhone} placeholder="Phone (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} keyboardType="phone-pad"/>
                </react_native_1.View>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: 0.65 }]}>
                  <vector_icons_1.Ionicons name="mail-outline" size={18} color={palette.muted}/>
                  <react_native_1.Text style={[styles.input, { color: palette.faint }]} numberOfLines={1}>
                    Official email is managed by admin
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="location-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={bioAddress} onChangeText={setBioAddress} placeholder="Address (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="navigate-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioCity} onChangeText={setBioCity} placeholder="City (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="map-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioState} onChangeText={setBioState} placeholder="State (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="pin-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioZip} onChangeText={setBioZip} placeholder="Zip (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="earth-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioCountry} onChangeText={setBioCountry} placeholder="Country (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={styles.twoCol}>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="person-add-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioEmergencyName} onChangeText={setBioEmergencyName} placeholder="Emergency contact name (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]}/>
                </react_native_1.View>
                <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="call-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput value={bioEmergencyPhone} onChangeText={setBioEmergencyPhone} placeholder="Emergency contact phone (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} keyboardType="phone-pad"/>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={styles.modalActions}>
                <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setShowBioModal(false)} disabled={savingBio}>
                  <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: savingBio ? 0.7 : 1 }]} onPress={saveBio} disabled={savingBio}>
                  {savingBio ? <react_native_1.ActivityIndicator color="#ffffff"/> : <react_native_1.Text style={styles.primaryBtnText}>Save</react_native_1.Text>}
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={showQualView} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]} numberOfLines={1}>
                {viewQualType === 'LICENSE' ? 'License document' : 'Certification document'}
              </react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => {
            setShowQualView(false);
            setViewQualFileUrl(null);
            setViewQualFileName(null);
        }} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.View style={styles.modalBody}>
              <react_native_1.Text style={[styles.viewDocTitle, { color: palette.text }]} numberOfLines={2}>
                {viewQualName || 'Document'}
              </react_native_1.Text>

              {viewQualFileUrl ? (() => {
            const url = getAuthedUrl(viewQualFileUrl);
            const lower = (viewQualFileName || viewQualFileUrl).toLowerCase();
            const isImage = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lower.endsWith(ext));
            if (isImage) {
                return (<react_native_1.TouchableOpacity activeOpacity={0.9} onPress={() => react_native_1.Linking.openURL(url)}>
                      <react_native_1.Image source={{ uri: url }} style={[styles.docPreview, { borderColor: palette.border }]}/>
                    </react_native_1.TouchableOpacity>);
            }
            return (<react_native_1.TouchableOpacity style={[styles.fileRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => react_native_1.Linking.openURL(url)} activeOpacity={0.85}>
                    <vector_icons_1.Ionicons name="document-outline" size={18} color={palette.cyan}/>
                    <react_native_1.Text style={[styles.fileText, { color: palette.text }]} numberOfLines={1}>
                      {viewQualFileName || 'Open document'}
                    </react_native_1.Text>
                    <vector_icons_1.Ionicons name="open-outline" size={18} color={palette.text}/>
                  </react_native_1.TouchableOpacity>);
        })() : null}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={showQualList} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Documents</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setShowQualList(false)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.ScrollView contentContainerStyle={styles.modalBody}>
              {qualSorted.length === 0 ? (<react_native_1.View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="cloud-upload-outline" size={18} color={palette.muted}/>
                  <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                    <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>No documents yet</react_native_1.Text>
                    <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Use the + button to add one.</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>) : (<react_native_1.View style={{ gap: 10 }}>
                  {qualSorted.map((q) => {
                const type = String(q.type || '').toUpperCase();
                const exp = q.expiryDate ? new Date(q.expiryDate) : null;
                const expLabel = exp ? exp.toLocaleDateString() : 'No expiry';
                const status = String(q.status || 'ACTIVE').toUpperCase();
                const badgeColor = status === 'EXPIRED' ? palette.red : status === 'ACTIVE' ? palette.green : palette.amber;
                const fileUrl = (q === null || q === void 0 ? void 0 : q.fileUrl) ? String(q.fileUrl) : '';
                const fileName = fileUrl ? fileUrl.split('/').pop() || null : null;
                return (<react_native_1.TouchableOpacity key={q.id} style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openEditQualification(q)}>
                        <vector_icons_1.Ionicons name={type === 'LICENSE' ? 'card-outline' : 'ribbon-outline'} size={18} color={palette.muted}/>
                        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                          <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>
                            {q.name}
                          </react_native_1.Text>
                          <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]} numberOfLines={1}>
                            {type} • {expLabel}
                          </react_native_1.Text>
                        </react_native_1.View>
                        <react_native_1.TouchableOpacity style={[styles.iconBtn, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={(e) => {
                        var _a;
                        (_a = e === null || e === void 0 ? void 0 : e.stopPropagation) === null || _a === void 0 ? void 0 : _a.call(e);
                        openQualView({ name: q === null || q === void 0 ? void 0 : q.name, type: q === null || q === void 0 ? void 0 : q.type, fileUrl: fileUrl || null, fileName });
                    }} disabled={!fileUrl} activeOpacity={0.85}>
                          <vector_icons_1.Ionicons name="eye-outline" size={18} color={(fileUrl ? palette.text : palette.faint2)}/>
                        </react_native_1.TouchableOpacity>
                        <react_native_1.View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                          <react_native_1.View style={[styles.dot, { backgroundColor: badgeColor }]}/>
                          <react_native_1.Text style={[styles.statusText, { color: palette.text }]}>{status}</react_native_1.Text>
                        </react_native_1.View>
                      </react_native_1.TouchableOpacity>);
            })}
                </react_native_1.View>)}
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={datePickerKind !== null} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>
                {datePickerKind === 'ISSUE' ? 'Select issue date' : datePickerKind === 'EXPIRY' ? 'Select expiry date' : 'Select date of birth'}
              </react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setDatePickerKind(null)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              <datetimepicker_1.default value={datePickerValue} mode="date" display={react_native_1.Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedDate) => {
            if (react_native_1.Platform.OS === 'android') {
                if ((event === null || event === void 0 ? void 0 : event.type) === 'dismissed') {
                    setDatePickerKind(null);
                    return;
                }
                if ((event === null || event === void 0 ? void 0 : event.type) === 'set' && selectedDate && datePickerKind) {
                    if (datePickerKind === 'ISSUE')
                        setIssueDate(selectedDate);
                    else if (datePickerKind === 'EXPIRY')
                        setExpiryDate(selectedDate);
                    else
                        setBioDob(selectedDate);
                    setDatePickerKind(null);
                }
                return;
            }
            if (selectedDate)
                setDatePickerValue(selectedDate);
        }}/>
              {react_native_1.Platform.OS === 'ios' ? (<react_native_1.View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setDatePickerKind(null)}>
                    <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo }]} onPress={() => {
                if (datePickerKind === 'ISSUE')
                    setIssueDate(datePickerValue);
                else if (datePickerKind === 'EXPIRY')
                    setExpiryDate(datePickerValue);
                else
                    setBioDob(datePickerValue);
                setDatePickerKind(null);
            }}>
                    <react_native_1.Text style={styles.primaryBtnText}>Done</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>) : null}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    bgGlowWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bgGlow: {
        position: 'absolute',
        width: 360,
        height: 360,
        borderRadius: 240,
        transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 28,
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 14,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarEdit: {
        position: 'absolute',
        right: -6,
        bottom: -6,
        width: 30,
        height: 30,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.0,
    },
    name: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    email: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
    },
    rolePill: {
        marginTop: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    badgeRow: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    heroActions: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    sectionCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 14,
    },
    sectionHeaderWrap: {
        gap: 10,
        marginBottom: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    sectionTitleWrap: {
        flex: 1,
        minWidth: 0,
        paddingTop: 2,
    },
    sectionHeaderActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    smallBtn: {
        width: 42,
        height: 42,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    rowTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    rowSub: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    statusPill: {
        height: 30,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    modalClose: {
        width: 38,
        height: 38,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 22,
        gap: 12,
    },
    twoCol: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    pillChoice: {
        flex: 1,
        height: 42,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillChoiceText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    field: {
        flex: 1,
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    secondaryBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    secondaryBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    primaryBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    fileRow: {
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    fileText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    viewDocTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: -0.2,
        marginBottom: 10,
    },
    docPreview: {
        width: '100%',
        height: 220,
        borderRadius: 18,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    aboutRow: {
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    aboutLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    aboutValue: {
        fontSize: 12,
        fontWeight: '900',
    },
    bottomPad: {
        height: 8,
    },
});
