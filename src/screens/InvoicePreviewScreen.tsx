import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ScrollView,
    StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Share2, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context/AppContext';
import { getInvoiceHTML, generateInvoicePDF, InvoicePrintSize, InvoiceTemplate } from '../utils/invoiceGenerator';
import { Sale } from '../utils/storage';

const SIZE_OPTIONS: { label: string; value: InvoicePrintSize }[] = [
    { label: 'A4', value: 'A4' },
    { label: 'A5', value: 'A5' },
    { label: '80mm Thermal', value: 'thermal80' },
    { label: '58mm Thermal', value: 'thermal58' },
];

const TEMPLATE_OPTIONS: { label: string; value: InvoiceTemplate; desc: string }[] = [
    { label: 'Classic', value: 'classic', desc: 'Red accent, formal' },
    { label: 'Modern', value: 'modern', desc: 'Gradient, cards' },
    { label: 'Minimal', value: 'minimal', desc: 'B&W, compact' },
];

interface Props {
    navigation: any;
    route: {
        params: {
            sale: Sale;
        };
    };
}

export const InvoicePreviewScreen: React.FC<Props> = ({ navigation, route }) => {
    const { settings } = useApp();
    const { colors, isDark } = useTheme();
    const sale = route.params.sale;

    const [selectedSize, setSelectedSize] = useState<InvoicePrintSize>(
        settings.invoicePrintSize || 'A4'
    );
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(
        settings.invoiceTemplate || 'classic'
    );
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

    const html = useMemo(
        () => getInvoiceHTML(sale, settings, selectedSize, selectedTemplate),
        [sale, settings, selectedSize, selectedTemplate]
    );

    const handleShare = async () => {
        await generateInvoicePDF(sale, settings, selectedSize, selectedTemplate);
    };

    const currentSizeLabel = SIZE_OPTIONS.find(s => s.value === selectedSize)?.label || 'A4';
    const currentTemplateLabel = TEMPLATE_OPTIONS.find(t => t.value === selectedTemplate)?.label || 'Classic';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.semantic.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.semantic.background}
            />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={22} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold }]}>
                    Invoice Preview
                </Text>
                <TouchableOpacity
                    onPress={handleShare}
                    style={[styles.shareBtn, { backgroundColor: colors.brand.primary }]}
                    activeOpacity={0.7}
                >
                    <Share2 size={18} color="#FFF" />
                    <Text style={[styles.shareBtnText, { fontFamily: tokens.typography.fontFamily.semibold }]}>
                        Share
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Controls - Under Header */}
            <View style={[styles.controls, { backgroundColor: isDark ? colors.brand.secondary : colors.semantic.surface, borderBottomColor: colors.border.default }]}>
                {/* Size Selector */}
                <View style={styles.dropdownWrap}>
                    <Text style={[styles.dropdownLabel, { color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium }]}>
                        Size
                    </Text>
                    <TouchableOpacity
                        onPress={() => { setShowSizeDropdown(!showSizeDropdown); setShowTemplateDropdown(false); }}
                        style={[styles.dropdownBtn, { backgroundColor: isDark ? colors.semantic.background : '#F1F5F9', borderColor: colors.border.default }]}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.dropdownValue, { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold }]}>
                            {currentSizeLabel}
                        </Text>
                        <ChevronDown size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                    {showSizeDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: isDark ? colors.brand.secondary : '#FFF', borderColor: colors.border.default }]}>
                            {SIZE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => { setSelectedSize(opt.value); setShowSizeDropdown(false); }}
                                    style={[
                                        styles.dropdownItem,
                                        selectedSize === opt.value && { backgroundColor: isDark ? colors.semantic.background : '#F1F5F9' },
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dropdownItemText, {
                                        color: selectedSize === opt.value ? colors.brand.primary : colors.text.primary,
                                        fontFamily: selectedSize === opt.value ? tokens.typography.fontFamily.semibold : tokens.typography.fontFamily.regular,
                                    }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Template Selector */}
                <View style={styles.dropdownWrap}>
                    <Text style={[styles.dropdownLabel, { color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium }]}>
                        Template
                    </Text>
                    <TouchableOpacity
                        onPress={() => { setShowTemplateDropdown(!showTemplateDropdown); setShowSizeDropdown(false); }}
                        style={[styles.dropdownBtn, { backgroundColor: isDark ? colors.semantic.background : '#F1F5F9', borderColor: colors.border.default }]}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.dropdownValue, { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold }]}>
                            {currentTemplateLabel}
                        </Text>
                        <ChevronDown size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                    {showTemplateDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: isDark ? colors.brand.secondary : '#FFF', borderColor: colors.border.default }]}>
                            {TEMPLATE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => { setSelectedTemplate(opt.value); setShowTemplateDropdown(false); }}
                                    style={[
                                        styles.dropdownItem,
                                        selectedTemplate === opt.value && { backgroundColor: isDark ? colors.semantic.background : '#F1F5F9' },
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <View>
                                        <Text style={[styles.dropdownItemText, {
                                            color: selectedTemplate === opt.value ? colors.brand.primary : colors.text.primary,
                                            fontFamily: selectedTemplate === opt.value ? tokens.typography.fontFamily.semibold : tokens.typography.fontFamily.regular,
                                        }]}>
                                            {opt.label}
                                        </Text>
                                        <Text style={[styles.dropdownDesc, { color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular }]}>
                                            {opt.desc}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={[styles.webview, { backgroundColor: '#fff' }]}
                    scalesPageToFit={true}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                />
            </View>


        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 17,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    shareBtnText: {
        color: '#FFF',
        fontSize: 13,
    },
    previewContainer: {
        flex: 1,
        margin: tokens.spacing.sm,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        zIndex: 1,
    },
    webview: {
        flex: 1,
    },
    controls: {
        flexDirection: 'row',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
        zIndex: 10,
        overflow: 'visible',
    },
    dropdownWrap: {
        flex: 1,
        position: 'relative',
    },
    dropdownLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    dropdownValue: {
        fontSize: 14,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
        zIndex: 100,
    },
    dropdownItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    dropdownItemText: {
        fontSize: 14,
    },
    dropdownDesc: {
        fontSize: 10,
        marginTop: 1,
    },
});

export default InvoicePreviewScreen;
