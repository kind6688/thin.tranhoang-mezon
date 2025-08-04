import { ActionEmitEvent } from '@mezon/mobile-components';
import { Colors, size } from '@mezon/mobile-ui';
import { AttachmentEntity, selectAllListAttachmentByChannel } from '@mezon/store-mobile';
import { Snowflake } from '@theinternetfolks/snowflake';
import { ApiMessageAttachment } from 'mezon-js/api.gen';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, Text, View, useWindowDimensions } from 'react-native';
import GalleryAwesome, { GalleryRef, RenderItemInfo } from 'react-native-awesome-gallery';
import { useSelector } from 'react-redux';
import { useThrottledCallback } from 'use-debounce';
import LoadingModal from '../LoadingModal/LoadingModal';
import { ItemImageModal } from './ItemImageModal';
import { RenderFooterModal } from './RenderFooterModal';
import { RenderHeaderModal } from './RenderHeaderModal';

interface IImageListModalProps {
	imageSelected?: AttachmentEntity;
	channelId: string;
}

interface IVisibleToolbarConfig {
	showHeader: boolean;
	showFooter: boolean;
}
const ORIGIN_SCALE = 1;
const TIME_TO_HIDE_THUMBNAIL = 5000;
const TIME_TO_SHOW_SAVE_IMAGE_SUCCESS = 3000;

export const ImageListModal = React.memo((props: IImageListModalProps) => {
	const { width, height } = useWindowDimensions();
	const { imageSelected, channelId } = props;
	const { t } = useTranslation('common');
	const [currentImage, setCurrentImage] = useState<AttachmentEntity | null>(null);
	const [visibleToolbarConfig, setVisibleToolbarConfig] = useState<IVisibleToolbarConfig>({ showHeader: true, showFooter: false });
	const [currentScale, setCurrentScale] = useState(1);
	const [showSavedImage, setShowSavedImage] = useState(false);
	const [isLoadingSaveImage, setIsLoadingSaveImage] = useState(false);
	const attachments = useSelector((state) => selectAllListAttachmentByChannel(state, channelId));
	const ref = useRef<GalleryRef>(null);
	const footerTimeoutRef = useRef<NodeJS.Timeout>(null);
	const imageSavedTimeoutRef = useRef<NodeJS.Timeout>(null);

	const initialIndex = useMemo(() => {
		if (attachments?.length) {
			return attachments.findIndex((file) => file?.url === imageSelected?.url);
		} else {
			return 0;
		}
	}, [attachments, imageSelected]);

	const formattedImageList = useMemo(() => {
		let index: number;
		if (attachments?.length) {
			index = attachments.findIndex((file) => file?.url === imageSelected?.url);
		} else {
			index = -1;
		}
		return index === -1
			? [{ ...imageSelected, id: `${Snowflake.generate()}` }, ...(attachments ? attachments : [])]
			: attachments
				? attachments
				: [];
	}, [attachments, imageSelected]);

	const onClose = () => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: true });
	};

	const updateToolbarConfig = useCallback(
		(newValue: Partial<IVisibleToolbarConfig>) => {
			setVisibleToolbarConfig({ ...visibleToolbarConfig, ...newValue });
		},
		[visibleToolbarConfig]
	);

	const onIndexChange = useCallback((newIndex: number) => {
		if (formattedImageList[newIndex]?.id !== currentImage?.id) {
			setCurrentImage(formattedImageList[newIndex]);
			ref.current?.reset();
		}
	}, []);

	const setTimeoutHideFooter = useCallback(() => {
		footerTimeoutRef.current = setTimeout(() => {
			updateToolbarConfig({
				showFooter: false
			});
		}, TIME_TO_HIDE_THUMBNAIL);
	}, [updateToolbarConfig]);

	const onTap = () => {
		updateToolbarConfig({
			showHeader: !visibleToolbarConfig.showHeader,
			showFooter: !visibleToolbarConfig.showHeader
		});
	};

	const clearTimeoutFooter = () => {
		footerTimeoutRef.current && clearTimeout(footerTimeoutRef.current);
	};

	const onPanStart = () => {
		clearTimeoutFooter();
		if (visibleToolbarConfig.showFooter) {
			setTimeoutHideFooter();
			return;
		}
		if (!visibleToolbarConfig.showFooter && currentScale === 1) {
			updateToolbarConfig({ showFooter: true });
			setTimeoutHideFooter();
			return;
		}
	};

	const onDoubleTap = (toScale: number) => {
		if (toScale > ORIGIN_SCALE) {
			clearTimeoutFooter();
			updateToolbarConfig({
				showHeader: false,
				showFooter: false
			});
		}
	};

	const onImageThumbnailChange = useCallback(
		(image: AttachmentEntity) => {
			const imageIndexSelected = formattedImageList?.findIndex((i) => i?.id === image?.id);
			if (imageIndexSelected > -1) {
				setCurrentImage(image);
				ref.current?.setIndex(imageIndexSelected);
				ref.current?.reset();

				if (visibleToolbarConfig.showFooter) {
					clearTimeoutFooter();
					setTimeoutHideFooter();
				}
			}
		},
		[formattedImageList, setTimeoutHideFooter, visibleToolbarConfig?.showFooter]
	);

	const renderItem = ({ item, index, setImageDimensions }: RenderItemInfo<ApiMessageAttachment>) => {
		return <ItemImageModal index={index} item={item} setImageDimensions={setImageDimensions} />;
	};

	const onImageSaved = useCallback(() => {
		setShowSavedImage(true);
		imageSavedTimeoutRef.current = setTimeout(() => {
			setShowSavedImage(false);
		}, TIME_TO_SHOW_SAVE_IMAGE_SUCCESS);
	}, []);

	const onLoading = useCallback((isLoading) => {
		setIsLoadingSaveImage(isLoading);
	}, []);

	useEffect(() => {
		if (visibleToolbarConfig.showFooter) {
			clearTimeout(footerTimeoutRef.current);
			setTimeoutHideFooter();
		}
	}, [visibleToolbarConfig?.showFooter, currentImage?.id, setTimeoutHideFooter]);

	useEffect(() => {
		return () => {
			footerTimeoutRef.current && clearTimeout(footerTimeoutRef.current);
			imageSavedTimeoutRef.current && clearTimeout(imageSavedTimeoutRef.current);
		};
	}, []);

	const setScaleDebounced = useThrottledCallback(setCurrentScale, 300);

	return (
		<View style={{ flex: 1 }}>
			{visibleToolbarConfig.showHeader && (
				<RenderHeaderModal onClose={onClose} imageSelected={currentImage} onImageSaved={onImageSaved} onLoading={onLoading} />
			)}
			<GalleryAwesome
				ref={ref}
				style={{ flex: 1 }}
				containerDimensions={{ height, width }}
				initialIndex={initialIndex === -1 ? 0 : initialIndex}
				data={formattedImageList}
				keyExtractor={(item, index) => `${item?.filename}_${index}`}
				onSwipeToClose={onClose}
				onIndexChange={onIndexChange}
				renderItem={renderItem}
				onDoubleTap={onDoubleTap}
				onTap={onTap}
				onPanStart={onPanStart}
				onScaleChange={setScaleDebounced}
			/>
			<RenderFooterModal
				allImageList={formattedImageList}
				visible={visibleToolbarConfig.showFooter}
				imageSelected={currentImage}
				onImageThumbnailChange={onImageThumbnailChange}
			/>
			{showSavedImage && (
				<View style={{ position: 'absolute', top: '50%', width: '100%', alignItems: 'center' }}>
					<View style={{ backgroundColor: Colors.bgDarkSlate, padding: size.s_10, borderRadius: size.s_10 }}>
						<Text style={{ color: Colors.white }}>{t('savedSuccessfully')}</Text>
					</View>
				</View>
			)}
			<LoadingModal isVisible={isLoadingSaveImage} />
		</View>
	);
});
