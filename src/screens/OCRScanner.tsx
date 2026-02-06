import React, { useState, useRef } from 'react';
import Constants from 'expo-constants';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera as CameraIcon, Image as ImageIcon, Zap, Check } from 'lucide-react-native';
import { tokens } from '../theme';
const TextRecognition = (() => {
    try {
        return require('@react-native-ml-kit/text-recognition').default;
    } catch (e) {
        return null;
    }
})();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OCRScannerProps {
    onScan: (text: string) => void;
    onClose: () => void;
    colors: any;
}

export const OCRScanner: React.FC<OCRScannerProps> = ({ onScan, onClose, colors }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef<any>(null);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.semantic.background }]}>
                <Text style={[styles.text, { color: colors.text.primary }]}>
                    We need your permission to show the camera
                </Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePhoto = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync();
            setScannedImage(photo.uri);
            processImage(photo.uri);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setScannedImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        }
    };

    const processImage = async (uri: string) => {
        setIsProcessing(true);
        try {
            if (!TextRecognition) {
                throw new Error('TextRecognition module not found');
            }
            const result = await TextRecognition.recognize(uri);
            if (result && result.text) {
                onScan(result.text);
            } else {
                throw new Error('No text found in image');
            }
        } catch (error) {
            console.warn('OCR Initialization or processing failed:', error);

            const isExpoGo = Constants?.appOwnership === 'expo';
            const message = isExpoGo
                ? 'On-device OCR requires a development build. Expo Go only supports demo mode.'
                : 'Could not initialize OCR. Make sure you are using a development build.';

            Alert.alert(
                'OCR Unavailable',
                message,
                [
                    { text: 'Cancel', onPress: () => setScannedImage(null), style: 'cancel' },
                    { text: 'Try Demo Data', onPress: () => onScan("Total: 540.00\nDate: 21-01-2026\nInvoice #12345\nFuel Purchase") }
                ]
            );
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            {!scannedImage ? (
                <CameraView style={styles.camera} ref={cameraRef}>
                    <View style={styles.overlay}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                        <View style={styles.frame} />
                        <View style={styles.controls}>
                            <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
                                <ImageIcon color="#fff" size={28} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                            <View style={styles.iconBtn} />
                        </View>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.preview}>
                    <Image source={{ uri: scannedImage }} style={styles.image} />
                    {isProcessing && (
                        <View style={styles.processingOverlay}>
                            <ActivityIndicator size="large" color={colors.brand.primary} />
                            <Text style={[styles.processingText, { color: colors.text.inverse }]}>
                                Extracting Text...
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between', padding: 20 },
    closeBtn: { alignSelf: 'flex-start', marginTop: 40, padding: 10 },
    frame: {
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_HEIGHT * 0.5,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 20,
        alignSelf: 'center',
        borderStyle: 'dashed',
    },
    controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 40 },
    iconBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    captureBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
    preview: { flex: 1 },
    image: { flex: 1, resizeMode: 'contain' },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingText: { marginTop: 20, fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    text: { fontSize: 16, textAlign: 'center', marginHorizontal: 40, marginBottom: 20 },
    btn: { backgroundColor: '#81B29A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    btnText: { color: '#fff', fontWeight: 'bold' },
});
