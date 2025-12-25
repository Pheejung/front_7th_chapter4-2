import { ChakraProvider } from "@chakra-ui/react";
import { ScheduleProvider } from "./contexts/ScheduleContext.tsx";
import { SearchDialogProvider } from "./contexts/SearchDialogContext.tsx";
import { ScheduleTables } from "./components/schedule/ScheduleTables.tsx";
import SearchDialog from "./components/search/SearchDialog.tsx";
import ScheduleDndProvider from "./providers/ScheduleDndProvider.tsx";

function App() {

  return (
    <ChakraProvider>
      <ScheduleProvider>
        <SearchDialogProvider>
          <ScheduleDndProvider>
            <ScheduleTables/>
            <SearchDialog />
          </ScheduleDndProvider>
        </SearchDialogProvider>
      </ScheduleProvider>
    </ChakraProvider>
  );
}

export default App;
