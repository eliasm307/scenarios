import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";

export default async function SessionPage({ params: { id } }: { params: { id: string } }) {
  if (typeof id !== "string") {
    throw new Error(`Invalid session id type, expected string but got "${typeof id}" instead.`);
  }

  return (
    <Grid minHeight='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Box zIndex={1}>
        <GameSession sessionId={id} />
      </Box>
    </Grid>
  );
}
