package config

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strconv"

	"nolightnofun/models"

	"github.com/tealeg/xlsx/v3"
)

// JSON helpers --------------------------------------------------------------

func LoadConfig(path string) (models.Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return models.Config{}, err
	}
	var cfg models.Config
	err = json.Unmarshal(data, &cfg)
	return cfg, err
}

func SaveConfig(path string, cfg models.Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// CSV helpers ---------------------------------------------------------------

func LoadPatchCSV(path string) ([]models.Patch, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	r := csv.NewReader(f)
	var patches []models.Patch
	for {
		rec, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, err
		}
		if len(rec) != 2 {
			continue
		}
		from, _ := strconv.Atoi(rec[0])
		to, _ := strconv.Atoi(rec[1])
		patches = append(patches, models.Patch{FromChannel: from, ToChannel: to})
	}
	return patches, nil
}

func SavePatchCSV(path string, p []models.Patch) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	for _, v := range p {
		_ = w.Write([]string{strconv.Itoa(v.FromChannel), strconv.Itoa(v.ToChannel)})
	}
	w.Flush()
	return w.Error()
}

// Excel helpers -------------------------------------------------------------

func LoadPatchXLSX(path string) ([]models.Patch, error) {
	file, err := xlsx.OpenFile(path)
	if err != nil {
		return nil, err
	}
	var patches []models.Patch
	sheet := file.Sheets[0]
	_ = sheet.ForEachRow(func(r *xlsx.Row) error {
		if r.GetCell(0) == nil || r.GetCell(1) == nil {
			return nil
		}
		from, _ := r.GetCell(0).Int()
		to, _ := r.GetCell(1).Int()
		patches = append(patches, models.Patch{FromChannel: from, ToChannel: to})
		return nil
	})
	return patches, nil
}

func SavePatchXLSX(path string, p []models.Patch) error {
	file := xlsx.NewFile()
	sheet, _ := file.AddSheet("patch")
	for _, v := range p {
		row := sheet.AddRow()
		row.AddCell().SetInt(v.FromChannel)
		row.AddCell().SetInt(v.ToChannel)
	}
	return file.Save(path)
}
