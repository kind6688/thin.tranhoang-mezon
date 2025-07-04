import { useEscapeKeyClose, useOnClickOutside } from '@mezon/core';
import { attachmentActions, selectAllListDocumentByChannel, selectCurrentChannel, selectTheme, useAppDispatch, useAppSelector } from '@mezon/store';
import { Icons } from '@mezon/ui';
import { RefObject, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import EmptyFile from './EmptyFile';
import FileItem from './FileItem';
import SearchFile from './SearchFile';

type FileModalProps = {
	onClose: () => void;
	rootRef?: RefObject<HTMLElement>;
};

const FileModal = ({ onClose, rootRef }: FileModalProps) => {
	const dispatch = useAppDispatch();
	const currentChannel = useSelector(selectCurrentChannel);
	const [keywordSearch, setKeywordSearch] = useState('');

	const appearanceTheme = useSelector(selectTheme);
	const allAttachments = useAppSelector((state) => selectAllListDocumentByChannel(state, (currentChannel?.channel_id ?? '') as string));
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const { channel_id: channelId, clan_id: clanId } = currentChannel || {};
		if (!channelId || !clanId) return;
		dispatch(attachmentActions.fetchChannelAttachments({ clanId, channelId }));
	}, []);

	const filteredAttachments = allAttachments.filter(
		(attachment) => attachment.filename && attachment.filename.toLowerCase().includes(keywordSearch.toLowerCase())
	);

	useEscapeKeyClose(modalRef, onClose);
	useOnClickOutside(modalRef, onClose, rootRef);

	return (
		<div
			ref={modalRef}
			tabIndex={-1}
			className="absolute top-8 right-0 rounded-md dark:shadow-shadowBorder shadow-shadowInbox z-[99999999] origin-top-right"
		>
			<div className="flex flex-col rounded-md min-h-[400px] md:w-[480px] max-h-[80vh] lg:w-[540px]  shadow-sm overflow-hidden">
				<div className="dark:bg-bgTertiary bg-bgLightTertiary flex flex-row items-center justify-between p-[16px] h-12">
					<div className="flex flex-row items-center border-r-[1px] dark:border-r-[#6A6A6A] border-r-[#E1E1E1] pr-[16px] gap-4">
						<Icons.FileIcon />
						<span className="text-base font-semibold cursor-default dark:text-white text-black">File</span>
					</div>
					<SearchFile setKeywordSearch={setKeywordSearch} />
					<div className="flex flex-row items-center gap-4">
						<button onClick={onClose}>
							<Icons.Close defaultSize="w-4 h-4 dark:text-[#CBD5E0] text-colorTextLightMode" />
						</button>
					</div>
				</div>
				<div
					className={`flex flex-col gap-2 py-2 dark:bg-bgSecondary bg-bgLightSecondary px-[16px] min-h-full flex-1 overflow-y-auto ${
						appearanceTheme === 'light' ? 'customSmallScrollLightMode' : 'thread-scroll'
					}`}
				>
					{filteredAttachments.map((attachment) => (
						<FileItem key={attachment.id} attachmentData={attachment} />
					))}

					{!filteredAttachments.length && <EmptyFile />}
				</div>
			</div>
		</div>
	);
};

export default FileModal;
