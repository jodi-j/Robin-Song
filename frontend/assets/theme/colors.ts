const colors = {
    background: '#F3E1D6',
    text: '#222E50',
    accent: '#ECA08D',
    primary: '#C0483A',
    secondary: '#8485Bf',
    bottomnav: '#FFF8F4',
    card: '#ECD4C7',
    white: '#FFFFFF',
    black: '#000000',
} as const;

export type Colors = typeof colors;
export default colors;