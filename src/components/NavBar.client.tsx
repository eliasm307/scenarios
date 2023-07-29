"use client";

import type { FlexProps } from "@chakra-ui/react";

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
} from "./ChakraUI.client";
import { HamburgerIcon } from "./Icons";
import UserProfileModal from "./UserProfileModal.client";
import type { UserContext } from "../app/providers";
import { useUserContext } from "../app/providers";

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
    <Button onClick={onEditProfile} variant='outline'>
      {userContext.userProfile.user_name}
    </Button>
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
  return (
    <Flex as='nav' alignItems='center' px={3} py={2} m={0} gap={3} boxShadow='md' {...flexProps}>
      <Heading as='h1' flex={1} fontSize='2xl'>
        🔮 Scenarios
      </Heading>
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
      <UserProfileModal disclosure={userProfileModalDisclosure} />
    </Flex>
  );
}
