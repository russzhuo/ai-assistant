import { MessageRow } from "@/types/supabase";
import cn from "classnames";

interface UnsupportedMessagePartProps {
  part: MessageRow["parts"][0];
}

const UnsupportedMessagePart: React.FC<UnsupportedMessagePartProps> = ({
  part,
}) => {
  return (
    <div className="my-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
      Unsupported part type: {part.type}
      <pre className="mt-2 bg-gray-800 text-white p-3 rounded text-xs overflow-auto">
        {JSON.stringify(part, null, 2)}
      </pre>
    </div>
  );
};

export default UnsupportedMessagePart;
