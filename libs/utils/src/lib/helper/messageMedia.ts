import {
	ApiAudio,
	ApiDimensions,
	ApiDocument,
	ApiGame,
	ApiLocation,
	ApiMediaExtendedPreview,
	ApiMediaFormat,
	ApiPhoto,
	ApiSticker,
	ApiVideo,
	ApiVoice,
	MediaContainer
} from '../types';
import { IS_OPFS_SUPPORTED, IS_OPUS_SUPPORTED, IS_PROGRESSIVE_SUPPORTED, IS_SAFARI, MAX_BUFFER_SIZE } from '../utils/windowEnvironment';
import { getDocumentHasPreview } from './documentInfo';
import { getAttachmentMediaType, matchLinkInMessageText } from './messages';

export type ActiveDownloads = Record<
	string,
	{
		format: ApiMediaFormat;
		filename: string;
		size: number;
		originChatId?: string;
		originMessageId?: number;
	}
>;

export type MediaWithThumbs = ApiPhoto | ApiVideo | ApiDocument | ApiSticker | ApiMediaExtendedPreview;
export type DownloadableMedia = ApiPhoto | ApiVideo | ApiDocument | ApiSticker | ApiAudio | ApiVoice | any;

type Target = 'micro' | 'pictogram' | 'inline' | 'preview' | 'full' | 'download';

export function getMessageContent(message: MediaContainer | any) {
	return message.content;
}

export function hasMessageMedia(message: MediaContainer | any) {
	return Boolean(
		getMessagePhoto(message) ||
			getMessageVideo(message) ||
			getMessageDocument(message) ||
			getMessageSticker(message) ||
			getMessageContact(message) ||
			getMessagePollId(message) ||
			getMessageAction(message) ||
			getMessageAudio(message) ||
			getMessageVoice(message)
	);
}

export function canEditMedia(message: MediaContainer | any) {
	const { photo, video, altVideos, audio, document, text, webPage, ...otherMedia } = message.content;

	return !video?.isRound && !Object.keys(otherMedia).length;
}

export function getMessagePhoto(message: MediaContainer | any) {
	return message.content.photo;
}

export function getMessageActionPhoto(message: MediaContainer | any) {
	return message.content.action?.type === 'suggestProfilePhoto' ? message.content.action.photo : undefined;
}

export function getMessageVideo(message: MediaContainer | any) {
	return message.content.video;
}

export function getMessageRoundVideo(message: MediaContainer | any) {
	const { video } = message.content;

	return video?.isRound ? video : undefined;
}

export function getMessageAction(message: MediaContainer | any) {
	return message.content.action;
}

export function getMessageAudio(message: MediaContainer | any) {
	return message.content.audio;
}

export function getMessageVoice(message: MediaContainer | any) {
	return message.content.voice;
}

export function getMessageSticker(message: MediaContainer | any) {
	return message.content.sticker;
}

export function getMessageDocument(message: MediaContainer | any) {
	return message.content.document;
}

export function getMessageWebPageDocument(message: MediaContainer | any) {
	return getMessageWebPage(message)?.document;
}

export function isDocumentPhoto(document: ApiDocument) {
	return document.innerMediaType === 'photo';
}

export function isDocumentVideo(document: ApiDocument) {
	return document.innerMediaType === 'video';
}

export function isMessageDocumentSticker(message: MediaContainer | any) {
	const document = getMessageDocument(message);
	return document ? document.mimeType === 'image/webp' : undefined;
}

export function getMessageContact(message: MediaContainer | any) {
	return message.content.contact;
}

export function getMessagePollId(message: MediaContainer | any) {
	return message.content.pollId;
}

export function getMessageInvoice(message: MediaContainer | any) {
	return message.content.invoice;
}

export function getMessageLocation(message: MediaContainer | any) {
	return message.content.location;
}

export function getMessageWebPage(message: MediaContainer | any) {
	return message.content.webPage;
}

export function getMessagePaidMedia(message: MediaContainer | any) {
	return message.content.paidMedia;
}

export function getMessageWebPagePhoto(message: MediaContainer | any) {
	return getMessageWebPage(message)?.photo;
}

export function getMessageDocumentPhoto(message: MediaContainer | any) {
	const document = getMessageDocument(message);
	return document && isDocumentPhoto(document) ? document : undefined;
}

export function getMessageWebPageVideo(message: MediaContainer | any) {
	return getMessageWebPage(message)?.video;
}

export function getMessageWebPageAudio(message: MediaContainer | any) {
	return getMessageWebPage(message)?.audio;
}

export function getMessageDocumentVideo(message: MediaContainer | any) {
	const document = getMessageDocument(message);
	return document && isDocumentVideo(document) ? document : undefined;
}

export function getMessageDownloadableMedia(message: MediaContainer | any): DownloadableMedia | undefined {
	return (
		getMessagePhoto(message) ||
		getMessageVideo(message) ||
		getMessageDocument(message) ||
		getMessageSticker(message) ||
		getMessageAudio(message) ||
		getMessageVoice(message) ||
		getMessageWebPagePhoto(message) ||
		getMessageWebPageVideo(message) ||
		getMessageWebPageAudio(message)
	);
}

function getMessageMediaThumbnail(message: MediaContainer | any) {
	const media =
		getMessagePhoto(message) ||
		getMessageVideo(message) ||
		getMessageDocument(message) ||
		getMessageSticker(message) ||
		getMessageWebPagePhoto(message) ||
		getMessageWebPageVideo(message) ||
		getMessageInvoice(message)?.extendedMedia;

	if (!media) {
		return undefined;
	}

	return media.thumbnail;
}

export function getMessageMediaThumbDataUri(message: MediaContainer | any) {
	return getMessageMediaThumbnail(message)?.dataUri;
}

export function getMediaThumbUri(media: MediaWithThumbs) {
	return media.thumbnail?.dataUri;
}

export function getMessageIsSpoiler(message: MediaContainer | any) {
	const media = getMessagePhoto(message) || getMessageVideo(message);

	const invoiceMedia = getMessageInvoice(message)?.extendedMedia;
	return Boolean(invoiceMedia || media?.isSpoiler);
}

export function buildStaticMapHash(geo: ApiLocation['geo'], width: number, height: number, zoom: number, scale: number) {
	const { long, lat, accessHash, accuracyRadius } = geo;

	// eslint-disable-next-line max-len
	return `staticMap:${accessHash}?lat=${lat}&long=${long}&w=${width}&h=${height}&zoom=${zoom}&scale=${scale}&accuracyRadius=${accuracyRadius}`;
}

export function getMessageMediaHash(message: MediaContainer | any, target: Target) {
	const { video, sticker, audio, voice, document } = message.content;

	const messagePhoto = getMessagePhoto(message) || getMessageWebPagePhoto(message);
	const actionPhoto = getMessageActionPhoto(message);
	const messageVideo = video || getMessageWebPageVideo(message);
	const messageDocument = document || getMessageWebPageDocument(message);
	const messageAudio = audio || getMessageWebPageAudio(message);

	if (messageVideo) {
		return getVideoMediaHash(messageVideo, target);
	}

	if (messagePhoto || actionPhoto) {
		return getPhotoMediaHash(messagePhoto || actionPhoto!, target, Boolean(actionPhoto));
	}

	if (messageDocument) {
		return getDocumentMediaHash(messageDocument, target);
	}

	if (sticker) {
		return getStickerMediaHash(sticker, target);
	}

	if (messageAudio) {
		return getAudioMediaHash(messageAudio, target);
	}

	if (voice) {
		return getVoiceMediaHash(voice, target);
	}

	return undefined;
}

export function getPhotoMediaHash(photo: ApiPhoto | ApiDocument, target: Target, isAction?: boolean) {
	const base = `photo${photo.id}`;
	const isVideo = photo.mediaType === 'photo' && photo.isVideo;

	switch (target) {
		case 'micro':
		case 'pictogram':
			return `${base}?size=${isAction ? 'a' : 'm'}`;
		case 'inline':
			return !hasMediaLocalBlobUrl(photo) ? `${base}?size=${isAction ? 'b' : 'x'}` : undefined;
		case 'preview':
			return `${base}?size=${isAction ? 'b' : 'x'}`;
		case 'download':
			return !isVideo ? base : getVideoProfilePhotoMediaHash(photo);
		case 'full':
		default:
			return base;
	}
}

export function getProfilePhotoMediaHash(photo: ApiPhoto) {
	return `photo${photo.id}?size=c`;
}

export function getVideoProfilePhotoMediaHash(photo: ApiPhoto) {
	if (!photo.isVideo) return undefined;
	return `photo${photo.id}?size=u`;
}

export function getVideoMediaHash(video: ApiVideo | ApiDocument, target: Target) {
	const base = `document${video.id}`;

	switch (target) {
		case 'micro':
		case 'pictogram':
			return `${base}?size=m`;
		case 'inline':
			return !hasMediaLocalBlobUrl(video) ? appendProgressiveQueryParameters(video, base) : undefined;
		case 'preview':
			return `${base}?size=x`;
		case 'download':
			return `${base}?download`;
		case 'full':
		default:
			return appendProgressiveQueryParameters(video, base);
	}
}

export function getVideoPreviewMediaHash(video: ApiVideo) {
	return video.hasVideoPreview ? `document${video.id}?size=v` : undefined;
}

export function getDocumentMediaHash(document: ApiDocument, target: Target) {
	const base = `document${document.id}`;

	switch (target) {
		case 'micro':
		case 'pictogram':
		case 'inline':
		case 'preview':
			if (!getDocumentHasPreview(document) || hasMediaLocalBlobUrl(document)) {
				return undefined;
			}

			return `${base}?size=m`;
		case 'full':
		case 'download':
		default:
			return base;
	}
}

export function getAudioMediaHash(audio: ApiAudio, target: Target) {
	const base = `document${audio.id}`;

	switch (target) {
		case 'micro':
		case 'pictogram':
			return getAudioHasCover(audio) ? `${base}?size=m` : undefined;
		case 'inline':
			return appendProgressiveQueryParameters(audio, base);
		case 'download':
			return `${base}?download`;
		default:
			return base;
	}
}

export function getVoiceMediaHash(voice: ApiVoice, target: Target) {
	const base = `document${voice.id}`;

	switch (target) {
		case 'micro':
		case 'pictogram':
			return undefined;
		case 'download':
			return `${base}?download`;
		case 'inline':
		default:
			return base;
	}
}

export function getWebDocumentHash(webDocument?: any) {
	if (!webDocument) return undefined;
	return `webDocument:${webDocument.url}`;
}

export function getStickerMediaHash(sticker: ApiSticker, target: Target) {
	const base = `document${sticker.id}`;

	switch (target) {
		case 'micro':
		case 'pictogram':
			if (!sticker.previewPhotoSizes?.some((size) => size.type === 's')) {
				return getStickerMediaHash(sticker, 'preview');
			}
			return `${base}?size=s`;
		case 'preview':
			return `${base}?size=m`;
		case 'download':
			return `${base}?download`;
		case 'inline':
		default:
			return base;
	}
}

export function getMediaHash(media: DownloadableMedia, target: Target) {
	switch (media.mediaType) {
		case 'photo':
			return getPhotoMediaHash(media, target);
		case 'video':
			return getVideoMediaHash(media, target);
		case 'document':
			return getDocumentMediaHash(media, target);
		case 'audio':
			return getAudioMediaHash(media, target);
		case 'voice':
			return getVoiceMediaHash(media, target);
		case 'sticker':
			return getStickerMediaHash(media, target);
		case 'webDocument':
			return getWebDocumentHash(media);
		default:
			return undefined;
	}
}

export function getGamePreviewPhotoHash(game: ApiGame) {
	const { photo } = game;

	if (photo) {
		return `photo${photo.id}?size=x`;
	}

	return undefined;
}

export function getGamePreviewVideoHash(game: ApiGame) {
	const { document } = game;

	if (document) {
		return `document${document.id}`;
	}

	return undefined;
}

export function appendProgressiveQueryParameters(media: ApiAudio | ApiVideo | ApiDocument, base: string) {
	if (IS_PROGRESSIVE_SUPPORTED && IS_SAFARI) {
		return `${base}?fileSize=${media.size}&mimeType=${media.mimeType}`;
	}

	return base;
}

export function getAudioHasCover(media: ApiAudio) {
	return media.thumbnailSizes && media.thumbnailSizes.length > 0;
}

export function getMediaFormat(media: DownloadableMedia, target: Target): ApiMediaFormat {
	const isDocument = media.mediaType === 'document';
	const hasInnerVideo = isDocument && media.innerMediaType === 'video';
	const isVideo = media.mediaType === 'video' || hasInnerVideo;
	const isAudio = media.mediaType === 'audio';
	const isVoice = media.mediaType === 'voice';

	const size = getMediaFileSize(media) || 0; // Media types that do not have `size` are smaller than `MAX_BUFFER_SIZE`

	if (target === 'download') {
		if (IS_PROGRESSIVE_SUPPORTED && size > MAX_BUFFER_SIZE && !IS_OPFS_SUPPORTED) {
			return ApiMediaFormat.DownloadUrl;
		}
		return ApiMediaFormat.BlobUrl;
	}

	if (isVideo && IS_PROGRESSIVE_SUPPORTED && (target === 'full' || target === 'inline')) {
		return ApiMediaFormat.Progressive;
	}

	if (isAudio || isVoice) {
		// Safari
		if (isVoice && !IS_OPUS_SUPPORTED) {
			return ApiMediaFormat.BlobUrl;
		}

		return ApiMediaFormat.Progressive;
	}

	return ApiMediaFormat.BlobUrl;
}

export function getMediaFileSize(media: DownloadableMedia) {
	return 'size' in media ? media.size : undefined;
}

export function hasMediaLocalBlobUrl(media: ApiPhoto | ApiVideo | ApiDocument) {
	if ('blobUrl' in media) {
		return Boolean(media.blobUrl);
	}

	if ('previewBlobUrl' in media) {
		return Boolean(media.previewBlobUrl);
	}

	return false;
}

export function getChatMediaMessageIds(messages: Record<number, any>, listedIds: number[], isFromSharedMedia = false) {
	return getMessageContentIds(messages, listedIds, isFromSharedMedia ? 'media' : 'inlineMedia');
}

export function getVideoDimensions(video: ApiVideo): ApiDimensions | undefined {
	if (video.width && video.height) {
		return video as ApiDimensions;
	}

	return undefined;
}

export function getMediaTransferState(progress?: number, isLoadNeeded = false, isUploading = false) {
	const isTransferring = isUploading || isLoadNeeded;
	const transferProgress = Number(progress);

	return {
		isUploading,
		isTransferring,
		transferProgress
	};
}

export function getMessageContentIds(messages: Record<number, any>, messageIds: number[], contentType: any | 'inlineMedia') {
	let validator: any;

	switch (contentType) {
		case 'media':
			validator = (message: any) => {
				const video = getMessageVideo(message);
				return getMessagePhoto(message) || (video && !video.isRound && !video.isGif);
			};
			break;

		case 'documents':
			validator = getMessageDocument;
			break;

		case 'links':
			validator = (message: any) => getMessageWebPage(message) || matchLinkInMessageText(message);
			break;

		case 'audio':
			validator = getMessageAudio;
			break;

		case 'voice':
			validator = (message: any) => {
				const video = getMessageVideo(message);
				return getMessageVoice(message) || (video && video.isRound);
			};
			break;

		case 'inlineMedia':
			validator = (message: any) => {
				const video = getMessageVideo(message);
				const document = getMessageDocument(message);
				return (
					getMessagePhoto(message) ||
					(video && !video.isRound && !video.isGif) ||
					(document && isDocumentPhoto(document)) ||
					(document && isDocumentVideo(document))
				);
			};
			break;

		default:
			return [] as Array<number>;
	}

	return messageIds.reduce((result, messageId) => {
		if (messages[messageId] && validator(messages[messageId])) {
			result.push(messageId);
		}

		return result;
	}, [] as Array<number>);
}

export function getMediaDuration(message: any) {
	const { audio, voice, video } = getMessageContent(message);
	const media = audio || voice || video || getMessageWebPageVideo(message) || getMessageWebPageAudio(message);
	if (!media) {
		return undefined;
	}

	return media.duration;
}

export function canReplaceMessageMedia(message: any, attachment: any) {
	const isPhotoOrVideo = Boolean(
		getMessagePhoto(message) || getMessageWebPagePhoto(message) || Boolean(getMessageVideo(message) || getMessageWebPageVideo(message))
	);
	const isFile = Boolean(getMessageAudio(message) || getMessageVoice(message) || getMessageDocument(message));

	const fileType = getAttachmentMediaType(attachment);

	return (isPhotoOrVideo && (fileType === 'photo' || fileType === 'video')) || (isFile && (fileType === 'audio' || fileType === 'file'));
}

export function isMediaLoadableInViewer(newMessage: any) {
	if (!newMessage.content) return false;
	if (newMessage.content.photo) return true;
	if (newMessage.content.video && !newMessage.content.video.isRound && !newMessage.content.video.isGif) return true;
	return false;
}

export function getMediaFilename(media: DownloadableMedia) {
	if ('fileName' in media && media.fileName) {
		return media.fileName;
	}

	if (media.mediaType === 'sticker') {
		const extension = media.isLottie ? 'tgs' : media.isVideo ? 'webm' : 'webp';
		return `${media.id}.${extension}`;
	}

	if (media.mediaType === 'photo') {
		return `${media.id}.${media.isVideo ? 'mp4' : 'jpg'}`;
	}

	if (media.mediaType === 'voice') {
		return `${media.id}.${IS_OPUS_SUPPORTED ? 'ogg' : 'wav'}`;
	}

	if ('id' in media && media.id) {
		return media.id;
	}

	return `${media.mediaType}-${Math.random().toString(36).slice(4)}`;
}

export function getIsDownloading(activeDownloads: ActiveDownloads, media: DownloadableMedia) {
	const hash = getMediaHash(media, 'download');
	if (!hash) return false;
	return Boolean(activeDownloads[hash]);
}
