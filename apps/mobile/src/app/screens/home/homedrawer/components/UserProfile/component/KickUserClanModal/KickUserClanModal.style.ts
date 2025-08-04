import { Attributes, baseColor, Colors, Metrics, size } from '@mezon/mobile-ui';
import { StyleSheet } from 'react-native';

export const style = (colors: Attributes) =>
	StyleSheet.create({
		container: {},
		headerContent: {
			paddingVertical: size.s_14,
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: size.s_14,
			backgroundColor: colors.bgInputPrimary,
		},
		userMinusIcon: { flexDirection: 'row', alignContent: 'center', justifyContent: 'center', marginBottom: size.s_20 },
		clanName: {
			textAlign: 'center',
			fontSize: size.medium,
			fontWeight: '700',
			color: colors.text,
		},
		textError: {
			textAlign: 'center',
			fontSize: size.s_14,
			fontWeight: '700',
			color: Colors.vividScarlet,
			paddingTop: size.s_10
		},
		description: {
			marginTop: size.s_14,
			textAlign: 'left',
			fontSize: size.s_14,
			fontWeight: '400',
			color: colors.textDisabled,
			lineHeight: 1.4 * 16
		},
		textAreaBox: {
			paddingVertical: Metrics.size.xl,
		},
		textReason: {
			fontSize: size.label,
			fontWeight: '600',
			color: Colors.textGray,
			marginBottom: size.s_10
		},
		input: {
			backgroundColor: Colors.bgCharcoal,
			color: Colors.textGray,
			fontSize: size.label,
			fontWeight: '600'
		},
		button: {
			borderRadius: size.s_20,
			backgroundColor: Colors.danger,
			padding: size.s_10
		},
		textButton: {
			fontWeight: '500',
			textAlign: 'center',
			fontSize: size.s_14,
			color: baseColor.white
		}
	});
