declare module "prismjs/components/prism-*" {
  import type { Grammar } from "prismjs";

  const grammar: Grammar;
  export default grammar;
}
