import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRatings } from '../../context/RatingsContext'
import RatingDialog from './RatingDialog'

export default function HandoverRatingGate() {
  const { isResponsavel, isProfessor, user } = useAuth()
  const { myPendingHandover, submitRating, dismissHandoverForRole } = useRatings()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(Boolean(myPendingHandover))
  }, [myPendingHandover?.id])

  if (!myPendingHandover) return null
  if (!isResponsavel && !isProfessor) return null

  const role = isProfessor ? 'professor' : 'responsavel'
  const title = isProfessor ? 'Avaliar entrega' : 'Avaliar retirada'
  const subtitle = isProfessor
    ? `Você entregou ${myPendingHandover.childName} para ${myPendingHandover.guardianName}.`
    : `Você retirou ${myPendingHandover.childName} com o professor.`

  return (
    <RatingDialog
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={() => {
        setOpen(false)
        dismissHandoverForRole(role)
      }}
      onSubmit={async ({ stars, comment }) => {
        submitRating({
          stars,
          comment,
          authorRole: role,
          handover: {
            ...myPendingHandover,
            professorName: isProfessor ? (user?.name || myPendingHandover.professorName) : myPendingHandover.professorName,
            guardianName: isResponsavel ? (user?.name || myPendingHandover.guardianName) : myPendingHandover.guardianName,
          },
        })
        setOpen(false)
      }}
    />
  )
}
