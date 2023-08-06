/* eslint-disable functional-core/purity */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  LiComponent,
  OrderedListComponent,
  UnorderedListComponent,
} from "react-markdown/lib/ast-to-react";
import type { ListProps } from "@chakra-ui/react";
import { Text, ListItem, OrderedList, UnorderedList } from "@chakra-ui/react";
import ChatImage from "./ChatImage";

const Li: LiComponent = ({ node, ...props }) => {
  return <ListItem {...props} marginLeft={5} />;
};

const COMMON_LIST_PROPS: ListProps = {
  listStylePosition: "outside",
};

const Ol: OrderedListComponent = ({ node, ...props }) => {
  return <OrderedList {...props} {...COMMON_LIST_PROPS} />;
};

const Ul: UnorderedListComponent = ({ node, ...props }) => {
  return <UnorderedList className='markdown-ul' {...props} {...COMMON_LIST_PROPS} />;
};

const P = ({ node, ...props }: Record<string, unknown>) => {
  return <Text className='markdown-p' {...props} />;
};

const MarkdownImage = ({ node, ...props }: Record<string, unknown>) => {
  return <ChatImage src={props.src as string} alt={props.alt as string} {...props} />;
};

export default function MarkdownRenderer({ markdownContent }: { markdownContent: string }) {
  return (
    <ReactMarkdown
      linkTarget='_blank'
      remarkPlugins={[remarkGfm]}
      components={{
        li: Li,
        ul: Ul,
        ol: Ol,
        p: P,
        img: MarkdownImage,
      }}
    >
      {markdownContent}
    </ReactMarkdown>
  );
}
