package patchmap

import "nolightnofun/models"

// ApplyPatchMap modifies DMX output by duplicating/moving channels
func ApplyPatchMap(original []byte, patches []models.Patch) []byte {
	result := make([]byte, len(original))
	copy(result, original)

	for _, p := range patches {
		if p.FromChannel >= 0 && p.FromChannel < len(original) &&
			p.ToChannel >= 0 && p.ToChannel < len(original) {
			result[p.ToChannel] = original[p.FromChannel]
		}
	}

	return result
}
