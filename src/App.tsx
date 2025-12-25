import { ChakraProvider } from "@chakra-ui/react";
import { ScheduleProvider } from "./contexts/ScheduleContext.tsx";
import { ScheduleTables } from "./components/schedule/ScheduleTables.tsx";
import ScheduleDndProvider from "./providers/ScheduleDndProvider.tsx";

function App() {

  return (
    <ChakraProvider>
      <ScheduleProvider>
        <ScheduleDndProvider>
          <ScheduleTables/>
        </ScheduleDndProvider>
      </ScheduleProvider>
    </ChakraProvider>
  );
}

export default App;
