import AuthForm from "../../components/client/AuthForm";
import { Grid, VStack } from "../../components/client/ChakraUI";
import NavBar from "../../components/client/NavBar";

export default function Home() {
  return (
    <Grid
      minHeight={{ md: "100dvh" }}
      height={{ base: "100dvh", md: undefined }}
      overflow='hidden'
      templateRows='auto 1fr'
      position='fixed'
      inset={0}
    >
      <NavBar zIndex={2} />
      <VStack as='section' className='game-session-container' zIndex={1} overflow='hidden'>
        <AuthForm />
      </VStack>
    </Grid>
  );
}
