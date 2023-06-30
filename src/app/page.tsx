import { Heading, VStack } from "../components/ChakraUI.client";
import HomeOptions from "../components/HomeOptions.client";

export default async function Home() {
  return (
    <VStack as='section' mx={3} height='100%'>
      <Heading>Welcome to the Scenario Game 🔮</Heading>
      <HomeOptions />
    </VStack>
  );
}
