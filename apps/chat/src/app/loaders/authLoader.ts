import {
	AppDispatch,
	accountActions,
	authActions,
	clansActions,
	directActions,
	emojiRecentActions,
	friendsActions,
	getStore,
	listChannelsByUserActions,
	listUsersByUserActions,
	selectCurrentClanId,
	selectSession,
	selectVoiceOpenPopOut,
	usersClanActions
} from '@mezon/store';
import { IWithError } from '@mezon/utils';
import { CustomLoaderFunction } from './appLoader';
import { waitForSocketConnection } from './socketUtils';

export interface IAuthLoaderData {
	isLogin: boolean;
	redirect?: string;
}

function getRedirectTo(initialPath?: string): string {
	const searchParams = new URLSearchParams(window.location.search);
	const redirectParam = searchParams.get('redirect');

	if (redirectParam) {
		return redirectParam;
	}

	if (initialPath && !initialPath.startsWith('/desktop')) {
		return initialPath;
	}

	return '';
}

const sleepWithNetworkCheck = async (delayMs: number): Promise<void> => {
	return new Promise((resolve) => {
		const handleOnline = () => {
			clearTimeout(timeoutId);
			window.removeEventListener('online', handleOnline);
			resolve();
		};
		window.addEventListener('online', handleOnline);
		const timeoutId = setTimeout(() => {
			window.removeEventListener('online', handleOnline);
			resolve();
		}, delayMs);
	});
};

const refreshSession = async ({ dispatch, initialPath }: { dispatch: AppDispatch; initialPath: string }) => {
	let retries = 6;
	let attempt = 0;
	let isRedirectLogin = false;
	const store = getStore();
	const sessionUser = selectSession(store?.getState());

	if (!sessionUser?.token) {
		return { isLogin: !isRedirectLogin } as IAuthLoaderData;
	}

	while (retries > 0) {
		try {
			const response = await dispatch(authActions.refreshSession());
			if (response?.payload === 'Redirect Login') {
				isRedirectLogin = true;
			}
			if (!(response as unknown as IWithError).error) {
				const profileResponse = await dispatch(accountActions.getUserProfile());
				if (!(profileResponse as unknown as IWithError).error) {
					return { isLogin: true } as IAuthLoaderData;
				}
				throw new Error('Session expired');
			}
		} catch (error) {
			console.error(`Error in refreshSession, retrying... (${5 - retries + 1}/5)`, error);
		}

		retries -= 1;
		attempt += 1;

		if (retries > 0) {
			const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);

			console.error(`Session expired, retrying in ${delayMs}ms... (${6 - retries + 1}/6)`);
			await sleepWithNetworkCheck(delayMs);
		} else {
			console.error('Session expired after 6 retries');
			const redirectTo = getRedirectTo(initialPath);
			dispatch(authActions.setLogout());
			const redirect = redirectTo ? `/desktop/login?redirect=${redirectTo}` : '/desktop/login';
			return { isLogin: !isRedirectLogin, redirect: isRedirectLogin ? redirect : '' } as IAuthLoaderData;
		}
	}
};

export const authLoader: CustomLoaderFunction = async ({ dispatch, initialPath }) => {
	const store = getStore();
	const isOpenVoicePopout = selectVoiceOpenPopOut(store.getState());

	if (isOpenVoicePopout) {
		const currentClanId = selectCurrentClanId(store.getState());
		dispatch(usersClanActions.fetchUsersClan({ clanId: currentClanId as string }));
	}
	const session = await refreshSession({ dispatch, initialPath: initialPath as string });
	await dispatch(waitForSocketConnection());

	dispatch(clansActions.joinClan({ clanId: '0' }));
	dispatch(listChannelsByUserActions.fetchListChannelsByUser({}));
	dispatch(listUsersByUserActions.fetchListUsersByUser({}));
	dispatch(friendsActions.fetchListFriends({}));
	dispatch(directActions.fetchDirectMessage({}));
	dispatch(emojiRecentActions.fetchEmojiRecent({}));
	// check network not connect
	if (!navigator.onLine) {
		const splashScreen = document.getElementById('splash-screen');
		const title = splashScreen?.querySelector('#splash-title') as HTMLSpanElement;
		title && (title.textContent = 'Connecting ...');
		await new Promise<void>((resolve) => {
			const handleOnline = () => {
				window.removeEventListener('online', handleOnline);
				setTimeout(() => {
					if (splashScreen) {
						splashScreen.style.display = 'none';
					}
					resolve();
				}, 3000);
			};
			window.addEventListener('online', handleOnline);
		});
	}

	return session;
};

export const shouldRevalidateAuth = () => {
	return false;
};
