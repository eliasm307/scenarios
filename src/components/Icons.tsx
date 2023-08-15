import {
  BsHandThumbsUp,
  BsHandThumbsUpFill,
  BsHandThumbsDown,
  BsHandThumbsDownFill,
  BsMoonStars as DarkModeIcon,
  BsSun as LightModeIcon,
  BsEye,
  BsEyeSlash,
} from "react-icons/bs";
import { GoMute, GoUnmute } from "react-icons/go";
import Image from "next/image";
import { Box } from "@chakra-ui/react";
import AppLogoIconSvg from "./assets/emoji_u1f52e.svg";

export { GiHamburgerMenu as HamburgerIcon } from "react-icons/gi";
export { LuSettings as SettingsIcon } from "react-icons/lu";

export { DarkModeIcon, LightModeIcon };

export const ShowPasswordIcon = () => <BsEye fontSize='1.5rem' />;
export const HidePasswordIcon = () => <BsEyeSlash fontSize='1.5rem' />;
export const StopSoundIcon = () => <GoMute fontSize='1.5rem' />;
export const SoundIcon = () => <GoUnmute fontSize='1.5rem' />;
export const ThumbsUpOutlineIcon = () => <BsHandThumbsUp fontSize='1.3rem' />;
export const ThumbsUpFilledIcon = () => <BsHandThumbsUpFill fontSize='1.3rem' />;
export const ThumbsDownOutlineIcon = () => <BsHandThumbsDown fontSize='1.3rem' />;
export const ThumbsDownFilledIcon = () => <BsHandThumbsDownFill fontSize='1.3rem' />;

export function AppLogoIcon({ size = "2rem" }: { size?: string }) {
  return (
    <Box position='relative' width={size} height={size}>
      <Image fill src={AppLogoIconSvg} alt='Scenarios Logo' />
    </Box>
  );
}
