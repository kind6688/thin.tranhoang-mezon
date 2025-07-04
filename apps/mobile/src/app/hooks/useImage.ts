import { appActions, useAppDispatch } from '@mezon/store-mobile';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import RNFetchBlob from 'rn-fetch-blob';

export function useImage() {
	const dispatch = useAppDispatch();

	const downloadImage = useCallback(
		async (imageUrl: string, type: string) => {
			try {
				const response = await RNFetchBlob.config({
					fileCache: true,
					appendExt: type
				}).fetch('GET', imageUrl);

				if (response.info().status === 200) {
					const filePath = response.path();
					return filePath;
				} else {
					console.error('Error downloading image:', response.info());
					return null;
				}
			} catch (error) {
				console.error('Error downloading image:', error);
			} finally {
				dispatch(appActions.setLoadingMainMobile(false));
			}
		},
		[dispatch]
	);

	const checkAndRequestPermission = async () => {
		const permission = Platform.select({
			ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
			android:
				typeof Platform.Version === 'number' && Platform.Version >= 33
					? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
					: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
		});

		if (!permission) return false;

		try {
			const result = await check(permission);

			switch (result) {
				case RESULTS.GRANTED:
					return true;
				case RESULTS.DENIED: {
					const requestResult = await request(permission);
					return requestResult === RESULTS.GRANTED;
				}
				case RESULTS.BLOCKED:
					Alert.alert('Permission Required', 'Please enable storage permission in your device settings to save images.', [{ text: 'OK' }]);
					return false;
				default:
					return false;
			}
		} catch {
			return false;
		}
	};

	const saveImageToCameraRoll = useCallback(
		async (filePath: string, type: string, isShowSuccessToast = true) => {
			try {
				const hasPermission = await checkAndRequestPermission();
				if (!hasPermission) {
					throw {
						message: 'Permission Required'
					};
				}
				await CameraRoll.save(filePath, { type: type === 'video' ? 'video' : 'photo' });

				isShowSuccessToast &&
					Toast.show({
						text1: 'Save successfully',
						type: 'info'
					});
			} catch (err) {
				Toast.show({
					text1: err?.message ? err?.message : 'Error saving image',
					type: 'error'
				});
				throw err;
			} finally {
				if (Platform.OS === 'android') {
					await RNFetchBlob.fs.unlink(filePath);
				}
				dispatch(appActions.setLoadingMainMobile(false));
			}
		},
		[dispatch]
	);

	return {
		downloadImage,
		saveImageToCameraRoll
	};
}
