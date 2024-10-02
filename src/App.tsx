import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, Container, Title, Text, Button, Notification, TextInput, Box } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import './App.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const queryClient = new QueryClient();

function Shell() {
  const [fileName, setFileName] = useState<string>(null);
  const [filePath, setFilePath] = useState<string>(null);
  const [steamCmdPath, setSteamCmdPath] = useState<string | null>(null);
  const [isSteamCmdInstalled, setIsSteamCmdInstalled] = useState<boolean>(false);
  const [isInstallingSteamCmd, setIsInstallingSteamCmd] = useState<boolean>(false);
  const [installDir, setInstallDir] = useState<string>('');

  const selectFile = async () => {
    const selected = await open({
      filters: [
        {
          name: 'JSON Files',
          extensions: ['json'],
        },
      ],
    });
    if (selected?.length) {
      setFilePath(selected);
      setFileName(selected.split('/').pop());
      notifications.show({
        message: `Selected file: ${selected}`,
        color: 'green'
      });
    }
  };

  const removeSelectedFile = () => {
    setFilePath(null);
    setFileName(null);
  };

  const installSteamCmd = async () => {
    setIsInstallingSteamCmd(true);
    try {
      const steamCmdInstallPath = await invoke('install', { customDir: null, installDir });
      setSteamCmdPath(steamCmdInstallPath as string);
      setIsSteamCmdInstalled(true);
      notifications.show({ message: `SteamCMD installed at: ${steamCmdInstallPath}`, color: 'green' });
    } catch (error) {
      notifications.show({ message: `Failed to install SteamCMD: ${error}`, color: 'red' });
    } finally {
      setIsInstallingSteamCmd(false);
    }
  };

  const installModsMutation = useMutation({
    mutationFn: async () => {
      if (!filePath) throw new Error('Please select a JSON file.');
      console.log('filePath', filePath, installDir);

      try {
        return await invoke('install_mods', {
          filePath: '/Users/matt/dev/rimrust/mods.json',
          installDir
        });
      } catch (error) {
        console.error('Failed to invoke install_mods:', error);
        throw new Error(`Failed to install mods: ${error}`);
      }
    },
    onMutate: () => {
      notifications.show({
        id: 'mods-installing',
        loading: true,
        message: 'Installing mods...',
        autoClose: false,
      });
    },
    onSuccess: () => {
      notifications.update({
        id: 'mods-installing',
        loading: false,
        message: 'Mods installed successfully!',
        color: 'green',
        autoClose: 5000,
      });
      removeSelectedFile();
    },
    onError: (error: any) => {
      notifications.update({
        id: 'mods-installing',
        loading: false,
        message: `Failed to install mods: ${JSON.stringify(error)}`,
        color: 'red',
        autoClose: 5000,
      });
    },
  });

  useEffect(() => {
    const defaultInstallDir = () => {
      if (navigator.appVersion.indexOf('Win') !== -1) return 'C:/RimRust/steamcmd';
      if (navigator.appVersion.indexOf('Mac') !== -1) return '~/Library/Application Support/Steam/steamapps/workshop/content/294100';
      if (navigator.appVersion.indexOf('Linux') !== -1) return '~/RimRust/steamcmd';
      return '';
    };
    setInstallDir(defaultInstallDir());

    invoke('is_installed')
      .then((path: string) => {
        setSteamCmdPath(path);
        setIsSteamCmdInstalled(true);
      })
      .catch(() => {
        setIsSteamCmdInstalled(false);
      });
  }, []);

  return (
    <Container px='xl' py='md'>
      <Title mb='md'>
        RimRust
      </Title>

      <Box mb='xs'>
        {isSteamCmdInstalled ? (
          <>
            <Text>SteamCMD is installed ✅</Text>
            <Text size='xs' color='dimmed'>{steamCmdPath}</Text>
          </>
        ) : (
          <>
            <Text>SteamCMD is not installed ❌</Text>
            <Button size='xs' color='dark' variant='white' radius='sm' mt='sm' onClick={installSteamCmd} disabled={isInstallingSteamCmd}>
              {isInstallingSteamCmd ? 'Installing...' : 'Install SteamCMD'}
            </Button>
          </>
        )}
      </Box>

      <Box mb='md'>
        <Text size='xs' color='dimmed'>
          You are on {navigator.appVersion.includes('Win') ? 'Windows' : navigator.appVersion.includes('Mac') ? 'MacOS' : 'Linux'}
        </Text>
      </Box>

      <TextInput
        label='Install Directory'
        value={installDir}
        onChange={(event) => setInstallDir(event.currentTarget.value)}
      />

      <Button size='xs' color='dark' variant='white' radius='sm' mt='sm' onClick={selectFile} disabled={installModsMutation.isLoading || !isSteamCmdInstalled}>
        {installModsMutation.isLoading ? 'Loading...' : 'Select Mod File'}
      </Button>

      {fileName && <Text size='xs' color='dimmed' my='xs'>File: {fileName}</Text>}

      {filePath && (
        <Button size='xs' color='dark' variant='white' radius='sm' onClick={() => installModsMutation.mutate()} disabled={installModsMutation.isLoading}>
          {installModsMutation.isLoading ? 'Installing...' : 'Install All Mods'}
        </Button>
      )}

      {filePath && <Button size='xs' color='red' variant='filled' radius='sm' ml='xs' onClick={removeSelectedFile}>Remove File</Button>}
    </Container>
  );
}

function App() {
  return (
    <MantineProvider forceColorScheme='dark'>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <Shell />
      </QueryClientProvider>
    </MantineProvider>
  );
}

export default App;