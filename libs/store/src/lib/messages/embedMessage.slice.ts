import { LoadingStatus } from '@mezon/utils';
import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';

export const EMBED_MESSAGE = 'EMBED_MESSAGE';

export interface FormDataEmbed {
	id: string;
	value: string;
}
export interface EmbedState {
	loadingStatus: LoadingStatus;
	formDataEmbed: Record<string, { [key: string]: string[] }>;
	optionsForm: Record<string, FormDataEmbed[]>;
}

export const initialEmbedState: EmbedState = {
	loadingStatus: 'not loaded',
	formDataEmbed: {},
	optionsForm: {}
};

export const embedSlice = createSlice({
	name: EMBED_MESSAGE,
	initialState: initialEmbedState,
	reducers: {
		addEmbedValue: (state, action: PayloadAction<{ message_id: string; data: FormDataEmbed; multiple?: boolean; onlyChooseOne?: boolean }>) => {
			const { message_id, data, multiple, onlyChooseOne } = action.payload;
			if (multiple) {
				if (!state.formDataEmbed[message_id]) {
					state.formDataEmbed[message_id] = {
						[data.id]: [data.value]
					};
				} else {
					const dataCurrent = state.formDataEmbed[message_id][data.id];
					if (dataCurrent.includes(data.value)) {
						state.formDataEmbed[message_id][data.id] = dataCurrent.filter((item) => item !== data.value);
						return;
					}
					state.formDataEmbed[message_id][data.id] = dataCurrent ? [...dataCurrent, data.value] : [data.value];
				}
				return;
			}
			if (!state.formDataEmbed[message_id]) {
				state.formDataEmbed[message_id] = {
					[data.id]: [data.value]
				};
				return;
			}
			if (state.formDataEmbed[message_id][data.id]) {
				if (onlyChooseOne) {
					state.formDataEmbed[message_id][data.id] = [data.value];
					return;
				}

				const listData = [...state.formDataEmbed[message_id][data.id], data.value];
				if (state.formDataEmbed[message_id][data.id].includes(data.value)) {
					state.formDataEmbed[message_id][data.id] = listData.filter((item) => item !== data.value);
					return;
				}

				state.formDataEmbed[message_id][data.id] = listData;
				return;
			}
			state.formDataEmbed[message_id][data.id] = [data.value];
		},
		removeEmbedValuel: (state, action: PayloadAction<{ message_id: string; data: FormDataEmbed; multiple?: boolean }>) => {
			const { message_id, data, multiple } = action.payload;
			if (state.formDataEmbed[message_id]?.[data.id] && multiple) {
				state.formDataEmbed[message_id][data.id] = [...state.formDataEmbed[message_id][data.id]].filter((item) => item !== data.value);
				return;
			}
			if (state.formDataEmbed[message_id][data.id]) {
				state.formDataEmbed[message_id][data.id] = [];
			}
		}
	}
});

export const embedReducer = embedSlice.reducer;

export const embedActions = {
	...embedSlice.actions
};

export const getEmbedState = (rootState: { [EMBED_MESSAGE]: EmbedState }): EmbedState => rootState[EMBED_MESSAGE];

export const selectDataFormEmbedByMessageId = createSelector([getEmbedState, (state, message_id: string) => message_id], (state, message_id) => {
	return state.formDataEmbed[message_id];
});
