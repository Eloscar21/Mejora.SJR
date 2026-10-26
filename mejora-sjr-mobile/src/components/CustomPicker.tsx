/**
 * CustomPicker.tsx
 * Componente de menú desplegable (Picker) accesible y reactivo (US-004).
 * 
 * Reglas de US-004:
 * - Permite seleccionar Departamentos y Categorías consumiendo los endpoints de US-002.
 * - Renderiza el elemento seleccionado, placeholder claro y lista interactiva modal.
 * - Incluye validación visual (borde rojo si hasError=true).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { PickerItem } from '../models/catalogo.types';

interface CustomPickerProps<T = number | string> {
  label: string;
  items: PickerItem<T>[];
  selectedValue?: T | null;
  onValueChange: (value: T) => void;
  placeholder?: string;
  hasError?: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
  isLoading?: boolean;
}

export function CustomPicker<T = number | string>({
  label,
  items,
  selectedValue,
  onValueChange,
  placeholder = '-- Seleccionar opción --',
  hasError = false,
  errorMessage,
  disabled = false,
  isLoading = false,
}: CustomPickerProps<T>) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find((item) => item.value === selectedValue);

  const handleSelect = (item: PickerItem<T>) => {
    onValueChange(item.value);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.trigger,
          hasError ? styles.triggerError : styles.triggerNormal,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && !isLoading && setModalVisible(true)}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando opciones...</Text>
          </View>
        ) : (
          <View style={styles.selectionRow}>
            <Text
              style={[
                styles.triggerText,
                !selectedItem && styles.placeholderText,
                hasError && styles.triggerTextError,
              ]}
              numberOfLines={1}
            >
              {selectedItem ? selectedItem.label : placeholder}
            </Text>
            {selectedItem?.extraInfo && (
              <View style={styles.extraBadge}>
                <Text style={styles.extraBadgeText}>{selectedItem.extraInfo}</Text>
              </View>
            )}
            <Text style={[styles.chevron, hasError && styles.chevronError]}>▼</Text>
          </View>
        )}
      </TouchableOpacity>

      {hasError && errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Modal Desplegable */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay opciones disponibles en este momento.</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item, index) => `${item.value}-${index}`}
                renderItem={({ item }) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.itemTextContainer}>
                        <Text
                          style={[
                            styles.itemLabel,
                            isSelected && styles.itemLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.extraInfo && (
                          <Text style={styles.itemExtraInfo}>
                            Dependencia: {item.extraInfo}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Text style={styles.checkIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  labelError: {
    color: COLORS.error,
  },
  trigger: {
    height: 50,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  triggerNormal: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  triggerError: {
    backgroundColor: COLORS.errorBackground,
    borderColor: COLORS.errorBorder,
  },
  triggerDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.7,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  triggerTextError: {
    color: COLORS.errorText,
  },
  placeholderText: {
    color: COLORS.placeholder,
  },
  chevron: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  chevronError: {
    color: COLORS.error,
  },
  extraBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.xs,
  },
  extraBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 61, 98, 0.45)', // Con tinte azul institucional SJR
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxHeight: '70%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemRowSelected: {
    backgroundColor: COLORS.primaryMuted,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  itemLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  itemExtraInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
