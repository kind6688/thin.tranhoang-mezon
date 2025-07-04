import { ChatContext } from '@mezon/core';
import {
	getAttachmentUnique,
	getUpdateOrAddClanChannelCache,
	PenIcon,
	PlayIcon,
	save,
	SearchIcon,
	SendIcon,
	STORAGE_CLAN_ID,
	STORAGE_DATA_CLAN_CHANNEL_CACHE
} from '@mezon/mobile-components';
import { Colors, size } from '@mezon/mobile-ui';
import {
	channelMetaActions,
	channelsActions,
	clansActions,
	directActions,
	getStore,
	getStoreAsync,
	selectAllChannelsByUser,
	selectClansEntities,
	selectCurrentChannelId,
	selectCurrentClanId,
	selectDirectsOpenlist
} from '@mezon/store-mobile';
import { handleUploadFileMobile, useMezon } from '@mezon/transport';
import { checkIsThread, createImgproxyUrl, EBacktickType, ILinkOnMessage, isPublicChannel, isYouTubeLink } from '@mezon/utils';
import { FlashList } from '@shopify/flash-list';
import debounce from 'lodash.debounce';
import { ChannelStreamMode, ChannelType } from 'mezon-js';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image as ImageRN, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Flow } from 'react-native-animated-spinkit';
import { Image, Video } from 'react-native-compressor';
import FastImage from 'react-native-fast-image';
import RNFS from 'react-native-fs';
import { useDispatch } from 'react-redux';
import StatusBarHeight from '../../../components/StatusBarHeight/StatusBarHeight';
import MezonAvatar from '../../../componentUI/MezonAvatar';
import MezonIconCDN from '../../../componentUI/MezonIconCDN';
import { IconCDN } from '../../../constants/icon_cdn';
import { isImage, isVideo } from '../../../utils/helpers';
import AttachmentFilePreview from '../../home/homedrawer/components/AttachmentFilePreview';
import SharingSuggestItem from './SharingSuggestItem';
import { styles } from './styles';

interface ISharing {
	data: any;
	onClose?: (isSend?: boolean) => void;
}

export const Sharing = ({ data, onClose }: ISharing) => {
	const store = getStore();

	const clans = useMemo(() => {
		return selectClansEntities(store.getState() as any);
	}, [store]);

	const listChannelsText = useMemo(() => {
		const listChannels = selectAllChannelsByUser(store.getState() as any);
		return listChannels.filter(
			(channel) => channel.type !== ChannelType.CHANNEL_TYPE_GMEET_VOICE && channel.type !== ChannelType.CHANNEL_TYPE_MEZON_VOICE
		);
	}, [store]);
	const listDM = selectDirectsOpenlist(store.getState() as any);

	const listDMText = useMemo(() => {
		return listDM.filter((channel) => !!channel.channel_label);
	}, [listDM]);

	const mezon = useMezon();
	const dispatch = useDispatch();
	const [dataText, setDataText] = useState<string>('');
	const [dataShareTo, setDataShareTo] = useState<any>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [searchText, setSearchText] = useState<string>('');
	const [channelSelected, setChannelSelected] = useState<any>();
	const inputSearchRef = useRef<any>(null);
	const [attachmentUpload, setAttachmentUpload] = useState<any>([]);
	const { handleReconnect } = useContext(ChatContext);
	const dataMedia = useMemo(() => {
		return data?.filter((data: { contentUri: string; filePath: string }) => !!data?.contentUri || !!data?.filePath);
	}, [data]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (data) {
			if (data?.length === 1 && (data?.[0]?.weblink || data?.[0]?.text)) {
				setDataText(data?.[0]?.weblink || data?.[0]?.text);
			}
		}
	}, [data]);

	useEffect(() => {
		handleReconnect('Initial reconnect attempt');
	}, [handleReconnect]);

	useEffect(() => {
		if (searchText) {
			handleSearchShareTo();
		} else {
			setDataShareTo([...listChannelsText, ...listDMText]);
		}
	}, [listChannelsText, listDMText, searchText]);

	useEffect(() => {
		if (dataMedia?.length) {
			convertFileFormat();
		}
	}, [dataMedia]);

	useEffect(() => {
		if (listChannelsText || listDMText) setDataShareTo([...listChannelsText, ...listDMText]);
	}, [listChannelsText, listDMText]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedSetSearchText = useMemo(() => debounce((value) => setSearchText(value), 200), []);
	const generateChannelMatch = (data: any, DMList: any, searchText: string) => {
		const matchChannels = [...DMList, ...data].filter((channel: { channel_label?: string | number }) =>
			channel.channel_label?.toString()?.trim()?.toLowerCase()?.includes(searchText?.trim()?.toLowerCase())
		);
		if (matchChannels.length > 0) {
			const matchIdList = new Set(matchChannels.map((item) => item.channel_id));
			const resultList = [...DMList, ...data].filter((item) => matchIdList.has(item.parent_id));

			return [...matchChannels, ...resultList];
		}
		return [];
	};

	const handleSearchShareTo = async () => {
		const matchedChannels = generateChannelMatch(listChannelsText, listDMText, searchText);
		setDataShareTo(matchedChannels || []);
	};

	const onChooseSuggestion = useCallback(async (channel: any) => {
		// Send to DM message
		if (channel.type === ChannelStreamMode.STREAM_MODE_DM || channel.type === ChannelStreamMode.STREAM_MODE_GROUP) {
			const store = await getStoreAsync();
			store.dispatch(
				directActions.joinDirectMessage({
					directMessageId: channel.id,
					channelName: channel.channel_label,
					type: channel.type
				})
			);
		}

		setChannelSelected(channel);
	}, []);

	const sendToDM = async (dataSend: { text: any; links: any[] }) => {
		const store = await getStoreAsync();
		await store.dispatch(
			channelsActions.joinChat({
				clanId: channelSelected?.clan_id,
				channelId: channelSelected?.channel_id,
				channelType: channelSelected?.type,
				isPublic: false
			})
		);

		await mezon.socketRef.current.writeChatMessage(
			'0',
			channelSelected.id,
			Number(channelSelected?.user_id?.length) === 1 ? ChannelStreamMode.STREAM_MODE_DM : ChannelStreamMode.STREAM_MODE_GROUP,
			false,
			{
				t: dataSend.text,
				mk: dataSend.links || []
			},
			[],
			getAttachmentUnique(attachmentUpload) || [],
			[]
		);
	};

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	const sendToGroup = async (dataSend: { text: any; links: any[] }) => {
		const clanIdStore = selectCurrentClanId(store.getState());
		const isPublic = channelSelected ? isPublicChannel(channelSelected) : false;
		const isDiffClan = clanIdStore !== channelSelected?.clan_id;
		requestAnimationFrame(async () => {
			if (isDiffClan) {
				await store.dispatch(clansActions.joinClan({ clanId: channelSelected.clan_id }));
				await store.dispatch(clansActions.changeCurrentClan({ clanId: channelSelected.clan_id }));
			}
			await store.dispatch(
				channelsActions.joinChannel({
					clanId: channelSelected.clan_id ?? '',
					channelId: channelSelected.channel_id,
					noFetchMembers: false,
					noCache: true
				})
			);
		});
		const dataSave = getUpdateOrAddClanChannelCache(channelSelected.clan_id, channelSelected.channel_id);
		save(STORAGE_DATA_CLAN_CHANNEL_CACHE, dataSave);
		save(STORAGE_CLAN_ID, channelSelected?.clan_id);
		await store.dispatch(
			channelsActions.joinChat({
				clanId: channelSelected.clan_id,
				channelId: channelSelected.channel_id,
				channelType: channelSelected.type,
				isPublic: isPublic
			})
		);

		await mezon.socketRef.current.writeChatMessage(
			channelSelected.clan_id,
			channelSelected.channel_id,
			checkIsThread(channelSelected) ? ChannelStreamMode.STREAM_MODE_THREAD : ChannelStreamMode.STREAM_MODE_CHANNEL,
			isPublic,
			{
				t: dataSend.text,
				mk: dataSend.links || []
			},
			[], //mentions
			getAttachmentUnique(attachmentUpload) || [], //attachments
			[], //references
			false, //anonymous
			false //mentionEveryone
		);
		const timestamp = Date.now() / 1000;
		dispatch(channelMetaActions.setChannelLastSeenTimestamp({ channelId: channelSelected.channel_id, timestamp }));
	};

	const processText = (inputString: string) => {
		const links: ILinkOnMessage[] = [];
		const httpPrefix = 'http';

		let i = 0;
		while (i < inputString.length) {
			if (inputString.startsWith(httpPrefix, i)) {
				// Link processing
				const startIndex = i;
				i += httpPrefix.length;
				while (i < inputString.length && ![' ', '\n', '\r', '\t'].includes(inputString[i])) {
					i++;
				}
				const endIndex = i;
				const isYoutube = isYouTubeLink(inputString);
				links.push({
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					type: isYoutube ? EBacktickType.LINKYOUTUBE : EBacktickType.LINK,
					s: startIndex,
					e: endIndex
				});
			} else {
				i++;
			}
		}

		return { links };
	};
	const onSend = async () => {
		setIsLoading(true);
		const { links } = processText(dataText);
		const dataSend = {
			text: dataText,
			links
		};
		// Send to DM message
		if (channelSelected.type === ChannelType.CHANNEL_TYPE_GROUP || channelSelected.type === ChannelType.CHANNEL_TYPE_DM) {
			await sendToDM(dataSend);
		} else {
			await sendToGroup(dataSend);
		}
		setIsLoading(false);
		onClose(true);
	};

	const getSizeImage = async (media: any) => {
		try {
			const fileInfo = await RNFS.stat(media.filePath || media?.contentUri);
			return fileInfo?.size || 0;
		} catch (e) {
			return 0;
		}
	};
	const convertFileFormat = async () => {
		try {
			const fileFormats = await Promise.all(
				dataMedia.map(async (media) => {
					if (!media?.filePath && !media?.contentUri) return null;
					const fileName = media?.fileName || media?.contentUri || media?.filePath;
					setAttachmentUpload((prev) => [
						...prev,
						{ url: media?.contentUri || media?.filePath, filename: fileName?.originalFilename || fileName }
					]);
					const fileSize = await getSizeImage(media);
					const checkIsVideo =
						(media?.filetype && media?.filetype?.startsWith('video')) ||
						(media?.mimeType && media?.mimeType?.startsWith('video')) ||
						isVideo(media?.filePath?.toLowerCase());
					const checkIsImage =
						(media?.filetype && media?.filetype?.startsWith('image')) ||
						(media?.mimeType && media?.mimeType?.startsWith('image')) ||
						isImage(media?.filePath?.toLowerCase());
					const pathCompressed = checkIsVideo
						? await compressVideo(media?.filePath || media?.contentUri)
						: checkIsImage
							? await compressImage(media?.filePath || media?.contentUri)
							: null;
					const fileData = await RNFS.readFile(pathCompressed || media.filePath || media?.contentUri, 'base64');
					let width = 600;
					let height = 900;
					if (checkIsImage) {
						await new Promise((resolve, reject) => {
							ImageRN.getSize(
								media?.contentUri || media?.filePath,
								(w, h) => {
									width = w;
									height = h;
									resolve(null);
								},
								(error) => {
									console.error('Failed to get image size: ', error);
									reject(error);
								}
							);
						});
					}
					return {
						uri: media.contentUri || media?.filePath,
						name: media?.fileName || media?.contentUri || media?.filePath,
						type: media?.mimeType,
						size: fileSize,
						width,
						height,
						fileData
					};
				})
			);
			handleFiles(fileFormats);
		} catch (e) {
			console.error(e);
		}
	};

	const compressImage = async (image: string) => {
		try {
			return await Image.compress(image, {
				compressionMethod: 'auto',
				quality: 0.9
			});
		} catch (error) {
			console.error('log  => error compressImage', error);
			return image;
		}
	};

	const compressVideo = async (video: string) => {
		try {
			return await Video.compress(video, {
				compressionMethod: 'auto'
			});
		} catch (error) {
			console.error('log  => error compressVideo', error);
			return video;
		}
	};

	const handleFiles = async (files: any) => {
		const maxRetries = 5;
		const retryDelay = 4000; // 4 seconds
		const clanIdStore = selectCurrentClanId(store.getState());
		const currentChannelId = selectCurrentChannelId(store.getState() as any);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const session = mezon.sessionRef.current;
				const client = mezon.clientRef.current;
				if (!files || !client || !session) {
					throw new Error('Client or files are not initialized');
				}

				const promises = Array.from(files).map((file: any) => {
					return handleUploadFileMobile(client, session, clanIdStore, currentChannelId, file.name, file);
				});

				const response = await Promise.all(promises);
				setAttachmentUpload(response);
				break;
			} catch (error) {
				if (attempt === maxRetries) {
					/* empty */
				} else {
					// alert(`Attempt ${attempt} failed. Retrying in ${retryDelay / 1000} seconds...`);
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				}
			}
		}
	};

	function removeAttachmentByUrl(urlToRemove: string) {
		setAttachmentUpload((prevAttachments) => prevAttachments.filter((attachment) => attachment.url !== urlToRemove));
	}

	const isAttachmentUploaded = useMemo(() => {
		if (!attachmentUpload) return true;

		return attachmentUpload.every((attachment: any) => attachment.url.includes('http'));
	}, [attachmentUpload]);

	const renderItemSuggest = ({ item, index }) => {
		return (
			<SharingSuggestItem key={`${item?.channel_id}_${index}_share_suggest_item`} item={item} clans={clans} onChooseItem={onChooseSuggestion} />
		);
	};

	return (
		<View style={styles.wrapper}>
			<StatusBarHeight />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => onClose()}>
					<MezonIconCDN icon={IconCDN.closeIcon} width={size.s_28} height={size.s_28} />
				</TouchableOpacity>
				<Text style={styles.titleHeader}>Share</Text>
				{channelSelected && isAttachmentUploaded ? (
					isLoading ? (
						<Flow size={size.s_28} color={Colors.white} />
					) : (
						<TouchableOpacity onPress={onSend}>
							<SendIcon width={size.s_28} height={size.s_20} color={Colors.white} />
						</TouchableOpacity>
					)
				) : (
					<View style={{ width: size.s_28 }} />
				)}
			</View>
			<ScrollView style={styles.container} keyboardShouldPersistTaps={'handled'}>
				<View style={styles.rowItem}>
					<Text style={styles.title}>Message preview</Text>
					{!!getAttachmentUnique(attachmentUpload)?.length && (
						<View style={[styles.inputWrapper, { marginBottom: size.s_16 }]}>
							<ScrollView horizontal style={styles.wrapperMedia}>
								{getAttachmentUnique(attachmentUpload)?.map((media: any, index) => {
									const isFile =
										Platform.OS === 'android'
											? !isImage(media?.filename?.toLowerCase()) && !isVideo(media?.filename?.toLowerCase())
											: !isImage(media?.url?.toLowerCase()) && !isVideo(media?.url?.toLowerCase());
									const isUploaded = media?.url?.includes('http');

									return (
										<View
											key={`${media?.url}_${index}_media_sharing`}
											style={[styles.wrapperItemMedia, isFile && { height: size.s_60, width: size.s_50 * 3 }]}
										>
											{isVideo(media?.filename?.toLowerCase()) && isVideo(media?.url?.toLowerCase()) && (
												<View style={styles.videoOverlay}>
													<PlayIcon width={size.s_20} height={size.s_20} />
												</View>
											)}
											{isFile ? (
												<AttachmentFilePreview attachment={media} />
											) : (
												<FastImage
													source={{
														uri: createImgproxyUrl(media?.url ?? '', { width: 300, height: 300, resizeType: 'fit' })
													}}
													style={styles.itemMedia}
												/>
											)}
											{isUploaded && (
												<TouchableOpacity
													style={styles.iconRemoveMedia}
													onPress={() => removeAttachmentByUrl(media.url ?? '')}
												>
													<MezonIconCDN icon={IconCDN.closeIcon} width={size.s_18} height={size.s_18} />
												</TouchableOpacity>
											)}

											{!isUploaded && (
												<View style={styles.videoOverlay}>
													<ActivityIndicator size={'small'} color={'white'} />
												</View>
											)}
										</View>
									);
								})}
							</ScrollView>
						</View>
					)}

					<View style={styles.inputWrapper}>
						<View style={styles.iconLeftInput}>
							<PenIcon width={size.s_18} />
						</View>
						<TextInput
							style={styles.textInput}
							value={dataText}
							onChangeText={(text) => setDataText(text)}
							placeholder={'Add a Comment (Optional)'}
							placeholderTextColor={Colors.tertiary}
						/>
						{!!dataText?.length && (
							<TouchableOpacity activeOpacity={0.8} onPress={() => setDataText('')} style={styles.iconRightInput}>
								<MezonIconCDN icon={IconCDN.closeIcon} width={size.s_18} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				<View style={styles.rowItem}>
					<Text style={styles.title}>Share to</Text>
					<View style={styles.inputWrapper}>
						{channelSelected ? (
							<View style={styles.iconLeftInput}>
								<MezonAvatar
									avatarUrl={channelSelected?.channel_avatar?.[0] || clans?.[channelSelected?.clan_id]?.logo}
									username={clans?.[channelSelected?.clan_id]?.clan_name || channelSelected?.channel_label}
									width={size.s_18}
									height={size.s_18}
								/>
							</View>
						) : (
							<View style={styles.iconLeftInput}>
								<SearchIcon width={size.s_18} height={size.s_18} />
							</View>
						)}
						{channelSelected ? (
							<Text style={styles.textChannelSelected}>{channelSelected?.channel_label}</Text>
						) : (
							<TextInput
								ref={inputSearchRef}
								style={styles.textInput}
								onChangeText={debouncedSetSearchText}
								placeholder={'Select a channel or category...'}
								placeholderTextColor={Colors.tertiary}
							/>
						)}
						{channelSelected ? (
							<TouchableOpacity
								activeOpacity={0.8}
								onPress={() => {
									setChannelSelected(undefined);
									inputSearchRef?.current?.focus?.();
								}}
								style={styles.iconRightInput}
							>
								<MezonIconCDN icon={IconCDN.closeIcon} width={size.s_18} />
							</TouchableOpacity>
						) : (
							!!searchText?.length && (
								<TouchableOpacity
									activeOpacity={0.8}
									onPress={() => {
										setSearchText('');
										inputSearchRef?.current?.clear?.();
									}}
									style={styles.iconRightInput}
								>
									<MezonIconCDN icon={IconCDN.closeIcon} width={size.s_18} />
								</TouchableOpacity>
							)
						)}
					</View>
				</View>

				{!!dataShareTo?.length && (
					<View style={styles.rowItem}>
						<Text style={styles.title}>Suggestions</Text>
						<FlashList
							data={dataShareTo}
							renderItem={renderItemSuggest}
							keyExtractor={(item, index) => `${item?.id}_${index}_suggestion`}
							estimatedItemSize={size.s_30}
						/>
					</View>
				)}
			</ScrollView>
		</View>
	);
};
