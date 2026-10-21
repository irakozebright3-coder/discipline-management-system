import { createContext } from 'react';
export const PlatformOwnerContext = createContext(false);
export const useIsPlatformOwner = () => useContext(PlatformOwnerContext);
