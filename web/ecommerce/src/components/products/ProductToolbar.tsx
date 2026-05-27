"use client";
import { useState, useRef, useEffect } from "react";
import { Box, TextField, InputAdornment, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import { useI18n } from "@/lib/i18n";

export type ViewMode = "grid" | "list";

interface Props {
  onSearch: (term: string) => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export default function ProductToolbar({ onSearch, viewMode, onViewChange }: Props) {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleChange = (value: string) => {
    setInputValue(value);
    // Cancel any pending call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Schedule new call in 500ms
    debounceRef.current = setTimeout(() => {
      onSearch(value);
      debounceRef.current = null;
    }, 500);
  };

  const handleClear = () => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch("");
  };

  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1.5, mb: 3,
      p: 1.5, bgcolor: "#fff", borderRadius: 2, border: "1px solid", borderColor: "grey.200",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Search input */}
      <TextField
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        size="small"
        sx={{ flex: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.disabled", fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: inputValue ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear} edge="end">
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      {/* View toggle */}
      <Box sx={{ display: "flex", border: "1px solid", borderColor: "grey.300", borderRadius: 1, overflow: "hidden" }}>
        <Tooltip title={t("viewGrid")} arrow>
          <IconButton
            size="small"
            onClick={() => onViewChange("grid")}
            sx={{
              borderRadius: 0,
              bgcolor: viewMode === "grid" ? "primary.main" : "transparent",
              color: viewMode === "grid" ? "#fff" : "text.secondary",
              "&:hover": { bgcolor: viewMode === "grid" ? "primary.dark" : "grey.100" },
              px: 1.25,
            }}
          >
            <GridViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ width: "1px", bgcolor: "grey.300" }} />
        <Tooltip title={t("viewList")} arrow>
          <IconButton
            size="small"
            onClick={() => onViewChange("list")}
            sx={{
              borderRadius: 0,
              bgcolor: viewMode === "list" ? "primary.main" : "transparent",
              color: viewMode === "list" ? "#fff" : "text.secondary",
              "&:hover": { bgcolor: viewMode === "list" ? "primary.dark" : "grey.100" },
              px: 1.25,
            }}
          >
            <ViewListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
