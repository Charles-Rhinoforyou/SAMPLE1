import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";
import { AuthProvider } from "../state/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textPrimary,
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Lessive & Pliage" }} />
          <Stack.Screen name="register" options={{ title: "Inscription" }} />
          <Stack.Screen name="login" options={{ title: "Connexion" }} />
          <Stack.Screen name="dashboard" options={{ title: "Mon compte" }} />
          <Stack.Screen name="tasks/index" options={{ title: "Annonces" }} />
          <Stack.Screen name="tasks/new" options={{ title: "Nouvelle annonce" }} />
          <Stack.Screen name="tasks/[id]" options={{ title: "Annonce" }} />
          <Stack.Screen name="verify-gdc" options={{ title: "Gens de Confiance" }} />
          <Stack.Screen name="admin" options={{ title: "Back-office" }} />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
