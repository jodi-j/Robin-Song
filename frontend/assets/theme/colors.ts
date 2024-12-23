const colors = {
    background: '#F9DFD2',
    text: '#222E50',
    accent: '#ECA08D',
    primary: '#C0483A',
    secondary: '#8485Bf',
    bottomnav: '#FFF8F4',
    card: '#ECD4C7',
    identifycard: '#EDCAB9',
    white: '#FFFFFF',
    black: '#000000',
  
    // Chat-specific colors
    chatGPTBackground: '#E7C4B8', 
    chatGPTCardBackground: '#F3E1D6',
    chatGPTAccentText: '#ECA08D', 
    chatGPTHeadingText: '#8485BF', 
  } as const;
  
  export type Colors = typeof colors;
  export default colors;
  