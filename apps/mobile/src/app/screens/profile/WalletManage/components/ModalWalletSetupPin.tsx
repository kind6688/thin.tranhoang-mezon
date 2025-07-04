import { ActionEmitEvent, save, STORAGE_ENCRYPTED_WALLET } from '@mezon/mobile-components';
import { size, useTheme } from '@mezon/mobile-ui';
import { accountActions } from '@mezon/store-mobile';
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import MezonIconCDN from '../../../../componentUI/MezonIconCDN';
import { IconCDN } from '../../../../constants/icon_cdn';
import useTabletLandscape from '../../../../hooks/useTabletLandscape';
import WalletCrypto from '../WalletCrypto';
import { style } from './styles';

interface IBuzzMessageModalProps {
	walletData: any;
}

export const ModalWalletSetupPin = memo((props: IBuzzMessageModalProps) => {
	const isTabletLandscape = useTabletLandscape();
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const [pin, setPin] = useState<string>('');
	const [pinConfirm, setPinConfirm] = useState<string>('');
	const { t } = useTranslation(['token']);
	const dispatch = useDispatch();
	const walletData = props?.walletData;

	const onConfirm = async () => {
		if (pin?.length !== 6) {
			Toast.show({
				type: 'error',
				text1: t('pinNotEnough')
			});
			return;
		}
		if (pin !== pinConfirm) {
			Toast.show({
				type: 'error',
				text1: t('pinNotMatch')
			});
			return;
		}
		saveEncryptedWallet(pinConfirm);
	};

	const saveEncryptedWallet = async (passcode: string) => {
		if (!walletData.privateKey) return;

		try {
			const encryptedPrivateKey = await WalletCrypto.encryptPrivateKey(walletData.privateKey, passcode);
			const encryptedRecoveryPhrase = await WalletCrypto.encryptPrivateKey(walletData.recoveryPhrase, passcode);

			const encryptedWallet = {
				address: walletData.address,
				encryptedPrivateKey,
				encryptedRecoveryPhrase,
				createdAt: new Date().toISOString()
			};

			save(STORAGE_ENCRYPTED_WALLET, JSON.stringify(encryptedWallet));

			const publicWalletInfo = {
				address: walletData.address,
				createdAt: new Date().toISOString()
			};
			dispatch(accountActions.setWalletMetadata(publicWalletInfo));
			onClose();
		} catch (error) {
			console.error('Error saving encrypted wallet:', error);
		}
	};

	const onClose = () => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: true });
	};

	return (
		<View style={styles.main}>
			<View style={[styles.container, isTabletLandscape && { maxWidth: '40%' }]}>
				<View style={styles.headerTitle}>
					<MezonIconCDN icon={IconCDN.lockIcon} height={size.s_20} width={size.s_20} color={'white'} />
					<Text style={styles.title}>{t('setUpPin')}</Text>
				</View>
				<Text style={styles.subTitle}>{t('create6Pin')}</Text>
				<View style={styles.textBox}>
					<TextInput
						style={styles.input}
						autoFocus={true}
						value={pin}
						secureTextEntry={true}
						maxLength={6}
						onChangeText={setPin}
						keyboardType={'numeric'}
					/>
				</View>
				<View style={styles.textBox}>
					<TextInput
						style={styles.input}
						secureTextEntry={true}
						value={pinConfirm}
						maxLength={6}
						onChangeText={setPinConfirm}
						keyboardType={'numeric'}
					/>
				</View>
				<Text style={styles.description}>{t('pinWillEncrypt')}</Text>

				<View style={styles.buttonsWrapper}>
					<TouchableOpacity onPress={onConfirm} style={styles.yesButton}>
						<MezonIconCDN icon={IconCDN.lockIcon} height={size.s_20} width={size.s_20} color={'white'} />
						<Text style={styles.buttonText}>{t('encryptWallet')}</Text>
					</TouchableOpacity>
				</View>
			</View>
			<TouchableOpacity style={styles.backdrop} onPress={onClose} />
		</View>
	);
});
