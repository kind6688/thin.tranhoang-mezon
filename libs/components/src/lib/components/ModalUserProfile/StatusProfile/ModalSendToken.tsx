import { FriendsEntity, ISendTokenDetailType, selectAllFriends, selectAllUserClans } from '@mezon/store';
import { Icons } from '@mezon/ui';
import { createImgproxyUrl, formatNumber } from '@mezon/utils';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AvatarImage, ModalLayout, useVirtualizer } from '../../../components';

type ModalSendTokenProps = {
	onClose: () => void;
	token: number;
	setToken: (token: number) => void;
	setSelectedUserId: (id: string) => void;
	handleSaveSendToken: (id?: string, username?: string, avatar?: string, display_name?: string) => void;
	setNote: (note: string) => void;
	error: string | null;
	userSearchError: string | null;
	userId: string;
	selectedUserId: string;
	note: string;
	sendTokenInputsState: {
		isSendTokenInputDisabled: boolean;
		isUserSelectionDisabled: boolean;
	};
	infoSendToken?: ISendTokenDetailType | null;
	isButtonDisabled: boolean;
};

const ModalSendToken = ({
	onClose,
	token,
	setToken,
	setSelectedUserId,
	handleSaveSendToken,
	setNote,
	error,
	userSearchError,
	userId,
	selectedUserId,
	note,
	sendTokenInputsState,
	infoSendToken,
	isButtonDisabled
}: ModalSendTokenProps) => {
	const usersClan = useSelector(selectAllUserClans);
	const friends = useSelector(selectAllFriends);

	const dropdownRef = useRef<HTMLDivElement>(null);
	const [searchTerm, setSearchTerm] = useState(infoSendToken?.receiver_name || '');
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [tokenNumber, setTokenNumber] = useState('');
	const [noteSendToken, setNoteSendToken] = useState(note || '');

	useEffect(() => {
		setSelectedUserId('');

		return () => {
			setSearchTerm('');
			setToken(0);
		};
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownRef]);

	const handleChangeSearchTerm = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchTerm(value);
		setIsDropdownOpen(true);
		setSelectedUserId('');
	};

	const handleSelectUser = (id: string, name: string) => {
		setSearchTerm(name);
		setIsDropdownOpen(false);
		setSelectedUserId(id);
	};

	const handleChangeSendToken = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/[^0-9]/g, '');
		setTokenNumber(formatNumber(Number(value), 'vi-VN'));
		setToken(Number(value));
	};

	const handleChangeNote = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setNote(value);
		setNoteSendToken(value);
	};

	const mergeUniqueUsers = (usersClan: any[], directMessages: any[]) => {
		const userMap = new Map();

		usersClan.forEach((itemUserClan) => {
			const userId = itemUserClan?.id ?? '';
			if (userId && !userMap.has(userId)) {
				userMap.set(userId, {
					id: userId,
					username: itemUserClan?.user?.username ?? '',
					avatar_url: itemUserClan?.user?.avatar_url ?? ''
				});
			}
		});

		directMessages.forEach((itemDM: FriendsEntity) => {
			const userId = itemDM?.user?.id ?? '';
			if (userId && !userMap.has(userId)) {
				userMap.set(userId, {
					id: userId,
					username: (itemDM?.user?.display_name || itemDM?.user?.username) ?? '',
					avatar_url: itemDM?.user?.avatar_url ?? ''
				});
			}
		});

		return Array.from(userMap.values());
	};

	const mergedUsers = mergeUniqueUsers(usersClan, friends);

	const filteredUsers = mergedUsers.filter((user: any) => user.username?.toLowerCase().includes(searchTerm.toLowerCase()) && user.id !== userId);

	const rowVirtualizer = useVirtualizer({
		count: filteredUsers?.length,
		getScrollElement: () => dropdownRef.current,
		estimateSize: () => 48,
		overscan: 5
	});

	useEffect(() => {
		const user = filteredUsers.find((user) => user.id === selectedUserId);
		if (user) {
			handleSelectUser(user.id, user.username);
			if (amountRef.current) {
				amountRef.current.focus();
			}
		}

		setTokenNumber(formatNumber(Number(token), 'vi-VN'));
	}, [token, selectedUserId]);

	const handleSendToken = () => {
		const userData = mergedUsers.find((user) => user.id === selectedUserId);
		handleSaveSendToken(userData?.id, userData?.username, userData?.avatar_url, userData?.display_name);
	};

	const amountRef = useRef<HTMLInputElement | null>(null);

	return (
		<ModalLayout className="bg-bgModalDark" onClose={onClose}>
			<div className="bg-theme-chat rounded-xl overflow-hidden w-[480px]">
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700 border-gray-200">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-button-add-friend text-theme-primary-hover flex items-center justify-center">
							<Icons.DollarIcon className="w-5 h-5" defaultFill="text-theme-primary" />
						</div>
						<div>
							<h1 className="text-theme-primary text-lg font-semibold">Send Tokens</h1>
							<p className="text-theme-secondary">Transfer tokens to another user</p>
						</div>
					</div>
					<button onClick={onClose} className="text-theme-primary text-theme-primary-hover transition-colors">
						<Icons.Close className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-6 border-t-theme-primary">
					<div className="space-y-3">
						<p className="text-theme-primary text-gray-700 text-sm font-medium flex items-center gap-2">To</p>
						<div className="relative">
							<input
								type="text"
								placeholder="Search users..."
								className="w-full h-12 px-4 pr-10 bg-input-theme border-theme-primary rounded-xl outline-none focus:ring-2  transition-all "
								value={searchTerm}
								onClick={() => setIsDropdownOpen(true)}
								onChange={handleChangeSearchTerm}
								disabled={sendTokenInputsState.isUserSelectionDisabled}
								autoFocus={!searchTerm}
							/>
							{isDropdownOpen && (
								<div
									className="absolute z-20 w-full mt-2 base-theme-color border-b-theme-primary rounded-xl shadow-lg max-h-48 overflow-y-auto thread-scroll text-theme-primary bg-theme-surface "
									ref={dropdownRef}
								>
									<div
										style={{
											height: `${rowVirtualizer.getTotalSize()}px`,
											width: '100%',
											position: 'relative'
										}}
									>
										{filteredUsers.length > 0 &&
											rowVirtualizer.getVirtualItems().map((virtualRow) => {
												const user = filteredUsers[virtualRow.index];

												return (
													<div
														key={virtualRow.index}
														style={{
															position: 'absolute',
															top: 0,
															left: 0,
															width: '100%',
															height: `${virtualRow.size}px`,
															transform: `translateY(${virtualRow.start}px)`
														}}
													>
														<div
															onClick={() => handleSelectUser(user.id, user.username)}
															className="flex items-center gap-3 p-3 hover:dark:bg-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
														>
															<AvatarImage
																alt={user?.username ?? ''}
																username={user?.username ?? ''}
																srcImgProxy={createImgproxyUrl(user.avatar_url ?? '', {
																	width: 100,
																	height: 100,
																	resizeType: 'fit'
																})}
																src={user.avatar_url}
																className="w-8 h-8"
																classNameText="text-xs w-8 h-8"
															/>
															<span className=" font-medium">{user.username}</span>
														</div>
													</div>
												);
											})}
										{filteredUsers.length === 0 && <div className="p-4 text-center text-">No users found</div>}
									</div>
								</div>
							)}
							{userSearchError && <p className="text-red-500 text-sm mt-2">{userSearchError}</p>}
						</div>
					</div>

					<div className="space-y-3">
						<p className="text-theme-primary text-gray-700 text-sm font-medium flex items-center gap-2">Amount</p>
						<div className="relative">
							<input
								ref={amountRef}
								type="text"
								value={tokenNumber}
								className="w-full h-12 px-4 pr-10 bg-input-theme border-theme-primary rounded-xl outline-none focus:ring-2  transition-all "
								placeholder="0"
								onChange={handleChangeSendToken}
								disabled={sendTokenInputsState.isSendTokenInputDisabled}
							/>
							<span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-primary font-medium">VND</span>
						</div>
						{error && <p className="text-red-500 text-sm">{error}</p>}
					</div>

					<div className="space-y-3">
						<p className="text-theme-primary text-gray-700 text-sm font-medium flex items-center gap-2">Note (Optional)</p>
						<input
							type="text"
							defaultValue={noteSendToken}
							className="w-full h-12 px-4 pr-10 bg-input-theme border-theme-primary rounded-xl outline-none focus:ring-2  transition-all "
							placeholder="Add a note..."
							onChange={handleChangeNote}
						/>
					</div>
				</div>

				<div className="p-6 border-t-theme-primary flex gap-3">
					<button
						className="flex-1 h-12 px-4 rounded-xl text-theme-primary border-theme-primary font-medium hover:opacity-80 transition-all"
						type="button"
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						className="flex-1 h-12 px-4 rounded-xl bg-button-add-friend hover:opacity-80 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
						type="button"
						onClick={handleSendToken}
						disabled={isButtonDisabled || !selectedUserId || token <= 0}
					>
						Send Tokens
					</button>
				</div>
			</div>
		</ModalLayout>
	);
};

export default ModalSendToken;
