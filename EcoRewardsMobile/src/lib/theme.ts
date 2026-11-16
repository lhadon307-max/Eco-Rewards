/**
 * Shared design tokens
 * Defines reusable colours and styles for consistent mobile screens.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import { StyleSheet } from 'react-native';
export const C = { bg: '#F5FBF7', white: '#FFFFFF', ink: '#10291E', muted: '#536B7F', green: '#096944', mint: '#DDF8F0', blue: '#096944', paleBlue: '#E5F8EC', orange: '#F6A83E', paleOrange: '#FFF4DE', border: '#DCEAE0', violet: '#7454D4', red: '#C94746' };
export const S = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.bg }, content: { padding: 20, paddingBottom: 80 }, heading: { color: C.ink, fontWeight: '900', fontSize: 29 }, sub: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 5 }, card: { backgroundColor: C.white, borderRadius: 22, padding: 18, marginBottom: 14, borderColor: C.border, borderWidth: 1 }, label: { fontSize: 14, color: C.ink, fontWeight: '800', marginBottom: 8, marginTop: 14 }, input: { borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', padding: 15, fontSize: 16, color: C.ink }, primary: { backgroundColor: C.blue, padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 16 }, primaryText: { fontSize: 16, color: '#fff', fontWeight: '800' }, secondary: { backgroundColor: C.paleBlue, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 }, secondaryText: { color: C.blue, fontWeight: '800' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 }, chipText: { color: C.ink, fontWeight: '700' }, small: { color: C.muted, fontSize: 12, lineHeight: 19 } });

