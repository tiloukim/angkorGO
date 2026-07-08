// Shared image picker — presents "Take photo / Choose from library" and returns
// a local URI (or null). Camera path requests permission first. Callers pass
// trilingual labels so the action sheet matches the app language.
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type PickLabels = {
  addPhoto: string; takePhoto: string; choosePhoto: string; cancel: string; cameraDenied: string;
};

// Single image via a Take-photo / Choose-from-library action sheet.
export function pickImage(labels: PickLabels): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(labels.addPhoto, undefined, [
      { text: labels.takePhoto, onPress: async () => resolve(await fromCamera(labels)) },
      { text: labels.choosePhoto, onPress: async () => resolve(await fromLibrary()) },
      { text: labels.cancel, style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

// Multiple images: camera adds one, library allows multi-select. Returns URIs.
export function pickImages(labels: PickLabels, selectionLimit = 10): Promise<string[]> {
  return new Promise((resolve) => {
    Alert.alert(labels.addPhoto, undefined, [
      { text: labels.takePhoto, onPress: async () => { const u = await fromCamera(labels); resolve(u ? [u] : []); } },
      { text: labels.choosePhoto, onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit });
          resolve(res.canceled ? [] : res.assets.map((a) => a.uri));
        } },
      { text: labels.cancel, style: 'cancel', onPress: () => resolve([]) },
    ]);
  });
}

async function fromCamera(labels: PickLabels): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) { Alert.alert(labels.cameraDenied); return null; }
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
  return res.canceled ? null : res.assets[0].uri;
}

async function fromLibrary(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  return res.canceled ? null : res.assets[0].uri;
}
