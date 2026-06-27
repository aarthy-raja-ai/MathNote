import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { tokens } from '../theme';

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    colors: any;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    visible,
    onClose,
    onScan,
    colors,
}) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [torch, setTorch] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) {
            setScanned(false);
            (async () => {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
            })();
        }
    }, [visible]);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScan(data);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                {hasPermission === null ? (
                    <View style={styles.center}>
                        <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
                    </View>
                ) : hasPermission === false ? (
                    <View style={styles.center}>
                        <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
                            No access to camera. Please enable it in settings.
                        </Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { marginTop: 20 }]}>
                            <Text style={{ color: '#fff' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <CameraView
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar", "aztec", "datamatrix", "pdf417"],
                            }}
                            enableTorch={torch}
                            style={StyleSheet.absoluteFillObject}
                        />

                        <View style={styles.overlay}>
                            <View style={styles.topBar}>
                                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                                    <X size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Scan Barcode</Text>
                                <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
                                    {torch ? <Zap size={24} color="#FFD700" /> : <ZapOff size={24} color="#fff" />}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.maskContainer}>
                                <View style={styles.maskRow} />
                                <View style={styles.maskMiddle}>
                                    <View style={styles.maskRow} />
                                    <View style={[styles.scannerFrame, { borderColor: colors.brand.primary }]}>
                                        <View style={[styles.corner, styles.topLeft, { borderColor: colors.brand.primary }]} />
                                        <View style={[styles.corner, styles.topRight, { borderColor: colors.brand.primary }]} />
                                        <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.brand.primary }]} />
                                        <View style={[styles.corner, styles.bottomRight, { borderColor: colors.brand.primary }]} />
                                        {scanned && (
                                            <View style={styles.scannedFeedback}>
                                                <Text style={styles.feedbackText}>Scanned!</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.maskRow} />
                                </View>
                                <View style={styles.maskRow} />
                            </View>

                            <View style={styles.bottomBar}>
                                <Text style={styles.hint}>Align barcode within the frame</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlay: { flex: 1, justifyContent: 'space-between' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    iconBtn: { padding: 8 },
    maskContainer: { flex: 1 },
    maskRow: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    maskMiddle: { flexDirection: 'row', height: 250 },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 0,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderWidth: 4,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scannedFeedback: {
        backgroundColor: 'rgba(0,180,0,0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    feedbackText: { color: '#fff', fontWeight: 'bold' },
    bottomBar: {
        paddingBottom: 50,
        paddingTop: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    hint: { color: '#fff', fontSize: 14, opacity: 0.8 },
    closeBtn: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
    }
});
