import { Box } from "@chakra-ui/react";
import { css } from "@emotion/react";
import NextImage from "next/image";
import { useState, type ComponentProps } from "react";
import Loading from "../Loading";

type Props = ComponentProps<typeof NextImage>;

export default function ChatImage({ src, ...props }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <Box>
      <Box
        className='image-container'
        position='relative'
        width='100%'
        height='20rem'
        // ! margin etc dont work for the image, need to use height e.g.: calc(100% - 2rem) !important;
        css={css`
          img {
            width: unset !important;
            border-radius: 5px;
            margin: auto;
          }
        `}
      >
        <NextImage
          src={src as string}
          fill
          objectFit='contain'
          {...props}
          onLoadingComplete={() => setIsLoaded(true)}
        />
        {!isLoaded && (
          <Loading
            key='loading'
            position='absolute'
            inset={0}
            left={0}
            backgroundColor='rgba(0,0,0,0.1)'
            text='Loading image...'
          />
        )}
      </Box>
    </Box>
  );
}
