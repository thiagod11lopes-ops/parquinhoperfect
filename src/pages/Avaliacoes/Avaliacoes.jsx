import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Button, Collapse } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useRatings } from '../../context/RatingsContext'
import '../../styles/global.scss'

const SCOPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'professores', label: 'Professores' },
  { id: 'criancas', label: 'Crianças' },
]

function StarsRow({ value }) {
  return (
    <Box className="avaliacao-stars" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        n <= value
          ? <StarIcon key={n} className="is-on" />
          : <StarBorderIcon key={n} className="is-off" />
      ))}
    </Box>
  )
}

function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (![y, m, d].every(Number.isFinite)) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

function matchesScope(rating, scope) {
  if (scope === 'professores') return rating.authorRole === 'professor'
  if (scope === 'criancas') return rating.authorRole === 'responsavel'
  return true
}

export default function Avaliacoes() {
  const { isGerente } = useAuth()
  const { ratings } = useRatings()
  const [scopeFilter, setScopeFilter] = useState('all')
  const [starFilter, setStarFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const scopeCounts = useMemo(() => ({
    all: ratings.length,
    professores: ratings.filter((r) => r.authorRole === 'professor').length,
    criancas: ratings.filter((r) => r.authorRole === 'responsavel').length,
  }), [ratings])

  const scopedRatings = useMemo(
    () => ratings.filter((r) => matchesScope(r, scopeFilter)),
    [ratings, scopeFilter],
  )

  const starCounts = useMemo(() => {
    const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    scopedRatings.forEach((r) => {
      if (map[r.stars] != null) map[r.stars] += 1
    })
    return map
  }, [scopedRatings])

  const filtered = useMemo(() => {
    if (starFilter === 'all') return scopedRatings
    const n = Number(starFilter)
    return scopedRatings.filter((r) => r.stars === n)
  }, [scopedRatings, starFilter])

  if (!isGerente) return <Navigate to="/dashboard" replace />

  const emptyMessage = () => {
    if (ratings.length === 0) {
      return 'Ainda não há avaliações. Elas aparecem após a retirada/entrega.'
    }
    if (filtered.length === 0 && starFilter !== 'all') {
      return 'Nenhuma avaliação com esse número de estrelas neste filtro.'
    }
    if (scopeFilter === 'professores') return 'Nenhuma avaliação de professores.'
    if (scopeFilter === 'criancas') return 'Nenhuma avaliação de crianças (responsáveis).'
    return 'Nenhuma avaliação encontrada.'
  }

  return (
    <Box className="page-container avaliacoes-page">
      <Box className="page-header">
        <Typography variant="body2" fontWeight={700}>
          Avaliações de entrega
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--app-font-color, #fff)', opacity: 0.9 }}>
          {ratings.length} avaliação(ões) · só o gerente visualiza
        </Typography>
      </Box>

      <Box className="avaliacoes-filters panel-card">
        <button
          type="button"
          className={`avaliacoes-filters-toggle ${filtersOpen ? 'is-open' : ''}`}
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <Typography className="avaliacoes-filters-title">Filtrar por</Typography>
          <ExpandMoreIcon className="avaliacoes-filters-chevron" />
        </button>
        {!filtersOpen && (
          <Typography className="avaliacoes-filters-hint">
            Toque para filtrar por Todos, Professores, Crianças e estrelas
          </Typography>
        )}
        <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" className="avaliacoes-filter-row" sx={{ mt: 1 }}>
            {SCOPE_FILTERS.map((item) => (
              <Button
                key={item.id}
                size="small"
                className={`avaliacao-filter-btn ${scopeFilter === item.id ? 'is-active' : ''}`}
                onClick={() => {
                  setScopeFilter(item.id)
                  setStarFilter('all')
                }}
              >
                {item.label} ({scopeCounts[item.id]})
              </Button>
            ))}
          </Stack>

          <Typography className="avaliacoes-filters-title" sx={{ mt: 1.5 }}>
            Estrelas
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" className="avaliacoes-filter-row">
            <Button
              size="small"
              className={`avaliacao-filter-btn ${starFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setStarFilter('all')}
            >
              Todas ({scopedRatings.length})
            </Button>
            {[5, 4, 3, 2, 1].map((n) => (
              <Button
                key={n}
                size="small"
                className={`avaliacao-filter-btn ${starFilter === String(n) ? 'is-active' : ''}`}
                onClick={() => setStarFilter(String(n))}
                startIcon={<StarIcon sx={{ fontSize: '1rem !important' }} />}
              >
                {n} ({starCounts[n]})
              </Button>
            ))}
          </Stack>
        </Collapse>
      </Box>

      {filtered.length === 0 ? (
        <Box className="avaliacoes-empty panel-card" sx={{ mt: 2 }}>
          <Typography>{emptyMessage()}</Typography>
        </Box>
      ) : (
        <Stack spacing={1.25} sx={{ mt: 2 }}>
          {filtered.map((item) => (
            <Box key={item.id} className="avaliacao-card panel-card">
              <Box className="avaliacao-card-top">
                <StarsRow value={item.stars} />
                <Typography className="avaliacao-meta">
                  {formatDate(item.date)} · {item.time}
                </Typography>
              </Box>
              <Typography className="avaliacao-child">{item.childName}</Typography>
              <Typography className="avaliacao-author">
                {item.authorRole === 'professor' ? 'Professor' : 'Responsável'}: {item.authorName}
              </Typography>
              <Typography className="avaliacao-comment">
                {item.comment || 'Sem comentário.'}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}
