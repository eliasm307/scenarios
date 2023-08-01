import { Heading, VStack } from "../components/client/ChakraUI";
import HomeOptions from "../components/client/HomeOptions";

export default function Home() {
  return (
    <VStack as='section' mx={3} height='100%'>
      <Heading>Welcome to the Scenario Game 🔮</Heading>
      <HomeOptions />
    </VStack>
  );
}
