"use client";

import { Spacer, type FlexProps, Tooltip } from "@chakra-ui/react";

import Link from "next/link";
import {
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
} from "./ChakraUI";
import { AppLogoIcon, HamburgerIcon, SettingsIcon } from "../Icons";
import UserProfileModal from "./UserProfileModal";
import type { UserContext } from "../../app/providers";
import { useUserContext } from "../../app/providers";
import { Path } from "../../utils/client/constants";
import { useIsLargeScreen } from "../../utils/client/hooks";

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
  const isLargeScreen = useIsLargeScreen();

  return (
    <Flex as='nav' alignItems='center' px={3} py={2} m={0} gap={3} boxShadow='md' {...flexProps}>
      <Link href={Path.Home}>
        <Heading as='h1' fontSize='2xl' display='flex' alignItems='center' gap={2}>
          <AppLogoIcon size='2rem' />
          Scenarios
        </Heading>
      </Link>
      <Spacer flex={1} />
      <Flex gap='inherit'>
        {isLargeScreen ? (
          <DesktopNavBarItems
            userContext={user}
            onEditProfile={userProfileModalDisclosure.onOpen}
          />
        ) : (
          <MobileNavBarItems userContext={user} onEditProfile={userProfileModalDisclosure.onOpen} />
        )}
      </Flex>
      {userProfileModalDisclosure.isOpen && (
        <UserProfileModal disclosure={userProfileModalDisclosure} />
      )}
    </Flex>
  );
}
