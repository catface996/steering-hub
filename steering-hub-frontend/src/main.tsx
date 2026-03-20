import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

import './index.css'
import App from './App'

dayjs.locale('zh-cn')

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366F1', dark: '#4F46E5', light: '#818CF8' },
    secondary: { main: '#8E8E93' },
    success: { main: '#32D583' },
    warning: { main: '#FFB547' },
    error: { main: '#E85A4F' },
    info: { main: '#6366F1' },
    background: {
      default: '#0B0B0E',
      paper: '#16161A',
    },
    text: {
      primary: '#FAFAF9',
      secondary: '#8E8E93',
      disabled: '#4A4A50',
    },
    divider: '#2A2A2E',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"DM Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 13,
    htmlFontSize: 16,
    h4: { fontWeight: 700, fontSize: '1.5rem' },
    h5: { fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '0.8125rem' },
    body2: { fontSize: '0.75rem' },
    subtitle1: { fontSize: '0.875rem' },
    subtitle2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem' },
    button: { fontSize: '0.8125rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0B0B0E',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          fontSize: 13,
        },
        sizeSmall: {
          padding: '6px 16px',
        },
        contained: {
          background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
          boxShadow: 'none',
          '&:hover': {
            background: 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#2A2A2E',
          color: '#FAFAF9',
          '&:hover': {
            borderColor: '#3A3A40',
            backgroundColor: 'rgba(99,102,241,0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#16161A',
          border: '1px solid #2A2A2E',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1A1A1E',
            borderRadius: 10,
            fontSize: 13,
            '& fieldset': {
              borderColor: '#2A2A2E',
            },
            '&:hover fieldset': {
              borderColor: '#3A3A40',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#8E8E93',
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1E',
          borderRadius: 10,
          fontSize: 13,
          '& fieldset': {
            borderColor: '#2A2A2E',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#2A2A2E',
          color: '#FAFAF9',
          fontSize: 13,
          padding: '8px 12px',
        },
        head: {
          fontWeight: 600,
          color: '#8E8E93',
          backgroundColor: '#16161A',
          fontSize: 12,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#1A1A1E !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 100,
          fontSize: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#16161A',
          border: '1px solid #2A2A2E',
          borderRadius: 16,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          backgroundColor: '#2A2A2E',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#2A2A2E',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
