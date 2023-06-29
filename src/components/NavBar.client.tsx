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
} from "./ChakraUI.client";
import { HamburgerIcon } from "./Icons";

type NavBarItemsProps = Record<string, never>;

function SignOutMenuItem({}: NavBarItemsProps) {
  return (
    <MenuItem as='a' display='block' color='red' fontWeight='bold' href='/auth/signout'>
      Sign Out
    </MenuItem>
  );
}

function DesktopNavBarItems({}: NavBarItemsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Menu>
      {({ isOpen }) => (
        <>
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

function MobileNavBarItems({}: NavBarItemsProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Menu>
      {({ isOpen }) => (
        <>
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
  return (
    <Flex alignItems='center' px={3} py={2} m={0} gap={3} boxShadow='md' {...flexProps}>
      <Heading as='h1' flex={1} fontSize='2xl'>
        Scenarios
      </Heading>
      <Flex gap='inherit'>
        <Show above='md'>
          <DesktopNavBarItems />
        </Show>
        <Show below='md'>
          <MobileNavBarItems />
        </Show>
      </Flex>
    </Flex>
  );
}
