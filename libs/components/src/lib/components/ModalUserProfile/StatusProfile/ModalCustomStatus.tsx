import { useAppDispatch, userClanProfileActions } from '@mezon/store';
import { Icons } from '@mezon/ui';
import { Dropdown } from 'flowbite-react';
import { ReactNode, useEffect, useState } from 'react';
import { ModalLayout } from '../../../components';

type ModalCustomStatusProps = {
	name: string;
	onClose: () => void;
	customStatus?: string;
	setCustomStatus: (customStatus: string) => void;
	handleSaveCustomStatus?: () => void;
	setResetTimerStatus: (minutes: number) => void;
	setNoClearStatus: (noClear: boolean) => void;
};

const ModalCustomStatus = ({
	name,
	customStatus,
	onClose,
	setCustomStatus,
	handleSaveCustomStatus,
	setResetTimerStatus,
	setNoClearStatus
}: ModalCustomStatusProps) => {
	const dispatch = useAppDispatch();

	useEffect(() => {
		dispatch(userClanProfileActions.setShowModalFooterProfile(false));
	}, []);

	const handleChangeCustomStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
		const updatedStatus = e.target.value.slice(0, 128).replace(/\\/g, '\\\\');
		setCustomStatus(updatedStatus);
	};

	const [timeSetReset, setTimeSetReset] = useState<string>('Today');

	const setStatusTimer = (minutes: number, noClear: boolean, option: string) => {
		setTimeSetReset(option);
		if (noClear) {
			setNoClearStatus(noClear);
		} else {
			if (option === 'Today') {
				const now = new Date();
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
				const timeDifference = endOfDay.getTime() - now.getTime();
				minutes = Math.floor(timeDifference / (1000 * 60));
			}
			setResetTimerStatus(minutes);
		}
	};

	return (
		<ModalLayout className="bg-bgModalDark" onClose={onClose}>
			<div className="bg-theme-surface pt-4 rounded w-[440px]">
				<div>
					<h1 className="text-theme-primary text-xl font-semibold text-center">Set a custom status</h1>
				</div>
				<div className="flex w-full flex-col gap-5 pt-4 bg-theme-surface">
					<div className="px-4">
						<div className="mb-2 block">
							<p className="text-theme-primary text-xs uppercase font-semibold">What's cookin', {name}</p>
						</div>
						<input
							type="text"
							defaultValue={customStatus}
							className="text-theme-primary bg-theme-direct-message outline-none w-full h-10 p-[10px] text-base rounded placeholder:text-sm border-theme-primary"
							placeholder="Support has arrived!"
							maxLength={128}
							autoFocus
							onChange={handleChangeCustomStatus}
						/>
					</div>
					<div className="px-4">
						<div className="mb-2 block">
							<p className="text-theme-primary text-xs uppercase font-semibold">Clear after</p>
						</div>
						<Dropdown
							trigger="click"
							dismissOnClick={false}
							renderTrigger={() => (
								<div className="flex items-center justify-between rounded-sm cursor-pointer h-9 text-theme-primary-hover bg-theme-direct-message px-3 text-theme-primary">
									<li className="text-[14px] text-theme-primary w-full py-[6px] list-none select-none">{timeSetReset}</li>
									<Icons.ArrowDown defaultFill="#fff" />
								</div>
							)}
							label=""
							placement="bottom-start"
							className="bg-theme-setting-primary border-none py-0 w-[200px] [&>ul]:py-0"
						>
							<ItemSelect children="Today" onClick={() => setStatusTimer(0, false, 'Today')} />
							<ItemSelect children="4 hours" onClick={() => setStatusTimer(240, false, '4 hours')} />
							<ItemSelect children="1 hours" onClick={() => setStatusTimer(60, false, '1 hours')} />
							<ItemSelect children="30 minutes" onClick={() => setStatusTimer(30, false, '30 minutes')} />
							<ItemSelect children="Don't clear" onClick={() => setStatusTimer(0, true, "Don't clear")} />
						</Dropdown>
					</div>
					<div className="px-4">
						<div className="mb-2 block">
							<label htmlFor="status" className="text-theme-primary text-xs uppercase font-semibold">
								Status
							</label>
						</div>
						<Dropdown
							trigger="click"
							dismissOnClick={false}
							renderTrigger={() => (
								<div className="flex items-center justify-between rounded-sm h-9 text-theme-primary-hover bg-theme-direct-message px-3 text-theme-primary">
									<li className="text-[14px] text-theme-primary w-full py-[6px] cursor-pointer list-none select-none">Online</li>
									<Icons.ArrowDown defaultFill="#fff" />
								</div>
							)}
							label=""
							placement="bottom-start"
							className="dark:bg-[#232428] bg-bgLightModeThird border-none py-0 w-[200px] [&>ul]:py-0"
						>
							<ItemSelect children="Online" startIcon={<Icons.OnlineStatus />} />
							<ItemSelect children="Idle" startIcon={<Icons.DarkModeIcon className="text-[#F0B232] -rotate-90" />} />
							<ItemSelect children="Do Not Disturb" startIcon={<Icons.MinusCircleIcon />} />
							<ItemSelect children="Invisible" startIcon={<Icons.OfflineStatus />} />
						</Dropdown>
					</div>
					<div className="flex justify-end p-4 gap-2 rounded-b bg-theme-surface">
						<button
							className="py-2 h-10 px-4 rounded bg-#58f76d hover:bg-#58f76d/80 focus:!ring-transparent text-theme-primary"
							type="button"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							className="py-2 h-10 px-4 rounded bg-bgSelectItem dark:bg-bgSelectItem hover:!bg-bgSelectItemHover focus:!ring-transparent text-white"
							type="button"
							onClick={handleSaveCustomStatus}
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</ModalLayout>
	);
};

type ItemSelectProps = {
	children: string;
	dropdown?: boolean;
	startIcon?: ReactNode;
	onClick?: () => void;
};

const ItemSelect = ({ children, dropdown, startIcon, onClick }: ItemSelectProps) => {
	return (
		<div
			onClick={onClick}
			className="flex items-center justify-between h-11 rounded-sm bg-theme-setting-nav text-theme-primary-hover cursor-pointer text-theme-primary bg-item-theme-hover-status px-3"
		>
			{startIcon && <div className="flex items-center justify-center h-[18px] w-[18px] mr-2">{startIcon}</div>}
			<li className="text-[14px] w-full list-none leading-[44px] ">{children}</li>
			<Icons.Check className="w-[18px] h-[18px]" />
		</div>
	);
};

export default ModalCustomStatus;
