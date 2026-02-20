import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/* ───────────── theme ───────────── */
const ACCENT = '#c1ec72';
const SURFACE = '#151518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.12)';

export type PlanType = 'monthly' | 'yearly' | null;
export type PaymentMethod = 'card' | 'juice' | null;

interface SubscriptionSectionProps {
  selectedPlan: PlanType;
  showPaymentOptions: boolean;
  selectedPayment: PaymentMethod;
  onSelectPlan: (plan: 'monthly' | 'yearly') => void;
  onProceed: () => void;
  onSelectPayment: (method: 'card' | 'juice') => void;
  onBack: () => void;
  onConfirmPayment: () => void;
}

export default function SubscriptionSection({
  selectedPlan,
  showPaymentOptions,
  selectedPayment,
  onSelectPlan,
  onProceed,
  onSelectPayment,
  onBack,
  onConfirmPayment,
}: SubscriptionSectionProps) {
  if (!showPaymentOptions) {
    return (
      <View style={styles.container}>
        {/* Free Trial Info */}
        <View style={styles.trialInfoBox}>
          <MaterialCommunityIcons name="gift-outline" size={20} color={ACCENT} />
          <Text style={styles.trialInfoText}>New users get 7 days free trial!</Text>
        </View>

        {/* Subscription Plans */}
        <Text style={styles.subscriptionTitle}>Choose a Plan</Text>
        
        {/* Monthly Plan */}
        <Pressable
          style={[
            styles.planOption,
            selectedPlan === 'monthly' && styles.planOptionSelected,
          ]}
          onPress={() => onSelectPlan('monthly')}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planDetails}>
            <Text style={styles.planName}>1 Month</Text>
            <Text style={styles.planDescription}>Billed monthly</Text>
          </View>
          <Text style={styles.planPrice}>Rs 100</Text>
        </Pressable>

        {/* Yearly Plan */}
        <Pressable
          style={[
            styles.planOption,
            selectedPlan === 'yearly' && styles.planOptionSelected,
          ]}
          onPress={() => onSelectPlan('yearly')}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'yearly' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planDetails}>
            <Text style={styles.planName}>12 Months</Text>
            <Text style={styles.planDescription}>Save Rs 0 - Best value!</Text>
          </View>
          <Text style={styles.planPrice}>Rs 1200</Text>
        </Pressable>

        {/* Proceed Button */}
        {selectedPlan && (
          <Pressable
            style={({ pressed }) => [
              styles.proceedBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={onProceed}
          >
            <Text style={styles.proceedBtnText}>Proceed</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Payment Options UI
  return (
    <View style={styles.container}>
      {/* Payment Options */}
      <Text style={styles.subscriptionTitle}>Select Payment Method</Text>
      
      {/* Selected Plan Summary */}
      <View style={styles.planSummary}>
        <Text style={styles.planSummaryText}>
          {selectedPlan === 'monthly' ? '1 Month Plan' : '12 Months Plan'}
        </Text>
        <Text style={styles.planSummaryPrice}>
          Rs {selectedPlan === 'monthly' ? '100' : '1200'}
        </Text>
      </View>

      {/* Credit Card Option */}
      <Pressable
        style={[
          styles.paymentOption,
          selectedPayment === 'card' && styles.paymentOptionSelected,
        ]}
        onPress={() => onSelectPayment('card')}
      >
        <View style={styles.paymentIconWrap}>
          <MaterialCommunityIcons name="credit-card-outline" size={24} color={TEXT_PRIMARY} />
        </View>
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentName}>Credit Card</Text>
          <Text style={styles.paymentDescription}>Visa, Mastercard, etc.</Text>
        </View>
        <View style={styles.paymentRadio}>
          {selectedPayment === 'card' && <View style={styles.paymentRadioInner} />}
        </View>
      </Pressable>

      {/* Juice Option */}
      <Pressable
        style={[
          styles.paymentOption,
          selectedPayment === 'juice' && styles.paymentOptionSelected,
        ]}
        onPress={() => onSelectPayment('juice')}
      >
        <View style={[styles.paymentIconWrap, { backgroundColor: 'rgba(255,107,0,0.15)' }]}>
          <MaterialCommunityIcons name="cellphone" size={24} color="#FF6B00" />
        </View>
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentName}>Juice by MCB</Text>
          <Text style={styles.paymentDescription}>Mobile payment</Text>
        </View>
        <View style={styles.paymentRadio}>
          {selectedPayment === 'juice' && <View style={styles.paymentRadioInner} />}
        </View>
      </Pressable>

      {/* Action Buttons */}
      <View style={styles.paymentActions}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onBack}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
        
        {selectedPayment && (
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={onConfirmPayment}
          >
            <Text style={styles.confirmBtnText}>Confirm Payment</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  trialInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(193,236,114,0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  trialInfoText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  subscriptionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  planOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(193,236,114,0.05)',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  planDescription: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  planPrice: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '700',
  },
  proceedBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  proceedBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  planSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(193,236,114,0.1)',
    borderRadius: 12,
    padding: 14,
  },
  planSummaryText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  planSummaryPrice: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  paymentOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(193,236,114,0.05)',
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentName: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  paymentDescription: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  backBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});
