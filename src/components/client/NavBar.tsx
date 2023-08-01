"use client";

import { Spacer, type FlexProps, Tooltip } from "@chakra-ui/react";

import Image from "next/image";
import Link from "next/link";
import {
  Show,
  Flex,
  Heading,
  useColorMode,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  IconButton,
  useDisclosure,
  Button,
  Box,
} from "./ChakraUI";
import { HamburgerIcon, SettingsIcon } from "../Icons";
import UserProfileModal from "./UserProfileModal";
import type { UserContext } from "../../app/providers";
import { useUserContext } from "../../app/providers";
import IconSvg from "./assets/emoji_u1f52e.svg";
import { Path } from "../../utils/client/constants";

type NavBarItemsProps = {
  onEditProfile?: () => void;
  userContext: UserContext;
};

function SignOutMenuItem() {
  return (
    <MenuItem as='a' display='block' color='red' fontWeight='bold' href='/auth/signout'>
      Sign Out
    </MenuItem>
  );
}

function UpdateProfileButton({ onEditProfile, userContext }: NavBarItemsProps) {
  return (
    <Tooltip label='Click to Edit User Settings' aria-label='Click to Edit User Settings'>
      <Button leftIcon={<SettingsIcon />} onClick={onEditProfile} variant='outline'>
        {userContext.userProfile.user_name}
      </Button>
    </Tooltip>
  );
}

function DesktopNavBarItems(config: NavBarItemsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <UpdateProfileButton {...config} />
          <MenuButton as={IconButton} isActive={isOpen} icon={<HamburgerIcon />} />
          <MenuList gap={2} px={2}>
            <MenuItem onClick={toggleColorMode}>
              {colorMode === "light" ? "Dark" : "Light"} Mode
            </MenuItem>
            <SignOutMenuItem />
          </MenuList>
        </>
      )}
    </Menu>
  );
}

function MobileNavBarItems(config: NavBarItemsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <UpdateProfileButton {...config} />
          <MenuButton as={IconButton} isActive={isOpen} icon={<HamburgerIcon />} />
          <MenuList gap={2} px={2}>
            <MenuItem onClick={toggleColorMode}>
              {colorMode === "light" ? "Dark" : "Light"} Mode
            </MenuItem>
            <SignOutMenuItem />
          </MenuList>
        </>
      )}
    </Menu>
  );
}

export default function NavBar(flexProps: FlexProps) {
  const userProfileModalDisclosure = useDisclosure();
  const user = useUserContext();

  // todo use a hook instead so everything isnt rendered
  return (
    <Flex as='nav' alignItems='center' px={3} py={2} m={0} gap={3} boxShadow='md' {...flexProps}>
      <Link href={Path.Home}>
        <Heading as='h1' fontSize='2xl' display='flex' alignItems='center' gap={2}>
          <Box position='relative' width='2rem' height='2rem'>
            <Image fill src={IconSvg} alt='React Logo' />
          </Box>
          Scenarios
        </Heading>
      </Link>
      <Spacer flex={1} />
      <Flex gap='inherit'>
        <Show above='md'>
          <DesktopNavBarItems
            userContext={user}
            onEditProfile={userProfileModalDisclosure.onOpen}
          />
        </Show>
        <Show below='md'>
          <MobileNavBarItems userContext={user} onEditProfile={userProfileModalDisclosure.onOpen} />
        </Show>
      </Flex>
      {userProfileModalDisclosure.isOpen && (
        <UserProfileModal disclosure={userProfileModalDisclosure} />
      )}
    </Flex>
  );
}
