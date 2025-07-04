import { useEscapeKeyClose } from '@mezon/core';
import { ChannelStatusEnum, IChannel } from '@mezon/utils';
import { ChannelType } from 'mezon-js';
import { useRef } from 'react';
import ButtonLoading from '../Button/ButtonLoading';
import { Hashtag, HashtagLocked, Speaker, SpeakerLocked } from '../Icons';

export type ModalProps = {
	children: React.ReactNode;
	showModal: boolean;
	title?: string;
	onClose: () => void;
	confirmButton?: () => void;
	titleConfirm?: string;
	disableButtonConfirm?: boolean;
	classNameBox?: string;
	subTitleBox?: string;
	classSubTitleBox?: string;
	borderBottomTitle?: string;
	classNameWrapperChild?: string;
	hasChannel?: IChannel;
	isInviteModal?: boolean;
};

const Modal = (props: ModalProps) => {
	const {
		showModal,
		onClose,
		confirmButton,
		title,
		children,
		titleConfirm,
		disableButtonConfirm,
		classNameBox,
		subTitleBox,
		classSubTitleBox,
		classNameWrapperChild,
		hasChannel,
		isInviteModal
	} = props;
	const modalRef = useRef<HTMLDivElement>(null);
	useEscapeKeyClose(modalRef, onClose);

	const handleConfirmClick = async () => {
		if (confirmButton) {
			await confirmButton();
		}
		onClose();
	};
	return (
		showModal && (
			<>
				<div
					ref={modalRef}
					tabIndex={-1}
					className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none base-theme-color bg-opacity-80  text-theme-primary hide-scrollbar overflow-hidden"
				>
					<div className={`relative w-full ${isInviteModal ? 'max-w-[480px]' : 'max-w-[684px]'} sm:h-auto ${classNameBox}`}>
						<div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-theme-setting-primary outline-none focus:outline-none h-full sm:h-auto">
							<div className={`flex items-start justify-between p-4 border-b-theme-primary rounded-t`}>
								<div>
									<h3 className="text-[22px] font-semibold cursor-default">{title}</h3>
									{hasChannel && (
										<div className="inline-flex gap-x-2">
											{hasChannel.channel_private === ChannelStatusEnum.isPrivate &&
												hasChannel.type === ChannelType.CHANNEL_TYPE_GMEET_VOICE && <SpeakerLocked defaultSize="w-5 h-5" />}
											{hasChannel.channel_private === ChannelStatusEnum.isPrivate &&
												hasChannel.type === ChannelType.CHANNEL_TYPE_CHANNEL && <HashtagLocked defaultSize="w-5 h-5 " />}
											{hasChannel.channel_private === undefined && hasChannel.type === ChannelType.CHANNEL_TYPE_GMEET_VOICE && (
												<Speaker defaultSize="w-5 5-5" />
											)}
											{hasChannel.channel_private === undefined && hasChannel.type === ChannelType.CHANNEL_TYPE_CHANNEL && (
												<Hashtag defaultSize="w-5 h-5" />
											)}
											<p>{hasChannel.channel_label}</p>
										</div>
									)}
									<p className={`${classSubTitleBox}`}>{subTitleBox}</p>
								</div>
								<button
									className="flex items-center justify-center opacity-50 text-theme-primary-hover"
									onClick={() => {
										onClose();
									}}
								>
									<span className="text-5xl leading-3">×</span>
								</button>
							</div>

							{/*body*/}
							<div className="relative px-5 pb-4 flex-auto  max-h-[500px] overflow-auto hide-scrollbar">
								<div className={`bg-theme-setting-nav rounded-[5px] p-3 ${classNameWrapperChild}`}>{children}</div>
							</div>
							{/*footer*/}
							{confirmButton && title !== 'Invite friends to KOMU' && (
								<div className="flex items-center p-4 border-b-theme-primary rounded-b justify-between">
									<button
										className="text-contentBrandLight background-transparent font-semibold px-4 py-2
										text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all
										duration-150 text-[16px] leading-6 rounded-lg"
										onClick={onClose}
									>
										Back
									</button>
									{titleConfirm && (
										<ButtonLoading
											className={`text-white font-semibold text-sm px-4 py-2 shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150 bg-primary text-[16px] leading-6 rounded ${disableButtonConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
											onClick={handleConfirmClick}
											label={titleConfirm}
											disabled={disableButtonConfirm}
										/>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="opacity-25 fixed inset-0 z-40 dark:bg-black bg-bgLightModeSecond"></div>
			</>
		)
	);
};

export default Modal;
