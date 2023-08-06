import { Heading, VStack } from "../components/client/ChakraUI";
import HomeOptions from "../components/client/HomeOptions";
import NavBar from "../components/client/NavBar";

export default function Home() {
  return (
    <VStack as='section' height='100%' width='100%' gap={5}>
      <NavBar />
      <VStack flex={1} mx={3}>
        <Heading>Welcome to Scenarios 🔮</Heading>
        <HomeOptions />
      </VStack>
    </VStack>
  );
}
