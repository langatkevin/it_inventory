from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..schemas import AssetTransitionRequest, AssignmentCreateRequest
from ..utils import ensure


class TransitionService:
    """Encapsulates asset lifecycle transitions."""

    def __init__(self, db: Session, actor: str | None = None):
        self.db = db
        self.actor = actor

    def run(self, asset: models.Asset, payload: AssetTransitionRequest) -> models.Asset:
        action = payload.action.lower()

        if action == "deploy":
            ensure(
                payload.person_id is not None,
                lambda: HTTPException(status.HTTP_400_BAD_REQUEST, "person_id required for deploy"),
            )
            request = AssignmentCreateRequest(
                person_id=payload.person_id,
                expected_return_date=payload.expected_return_date,
                notes=payload.notes,
                monitors=payload.peripherals,
            )
            self._deploy(asset, request, payload.target_location_id)
        elif action == "return":
            self._return_to_store(asset, payload.target_location_id, payload.notes)
        elif action == "repair":
            self._mark_repair(asset, payload.notes)
        elif action == "retire":
            self._retire(asset, payload.notes)
        elif action == "move":
            ensure(
                payload.target_location_id is not None,
                lambda: HTTPException(status.HTTP_400_BAD_REQUEST, "target_location_id required"),
            )
            self._move(asset, payload.target_location_id, payload.notes)
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Unknown transition '{payload.action}'",
            )

        self.db.flush()
        self.db.refresh(asset)
        return asset

    def _deploy(
        self,
        asset: models.Asset,
        request: AssignmentCreateRequest,
        target_location_id: str | None,
    ) -> None:
        previous_status = asset.status
        previous_location = asset.location_id

        open_assignments = [
            assignment for assignment in asset.assignments if assignment.end_date is None
        ]
        for assignment in open_assignments:
            assignment.end_date = datetime.utcnow()
            assignment.notes = (assignment.notes or "") + "\nAuto-closed before new deployment."
            self._log_event(
                asset,
                models.EventAction.assignment_ended,
                notes=f"Closed assignment {assignment.id}",
            )

        assignment = models.Assignment(
            asset_id=asset.id,
            person_id=request.person_id,
            start_date=datetime.utcnow(),
            expected_return_date=request.expected_return_date,
            primary_device=request.primary_device,
            notes=request.notes,
        )
        self.db.add(assignment)
        self._log_event(
            asset,
            models.EventAction.assignment_started,
            notes=f"Assigned to person {request.person_id}",
        )

        asset.status = models.AssetStatus.active
        if target_location_id:
            asset.location_id = target_location_id
        if request.notes:
            asset.notes = (asset.notes or "") + f"\n{request.notes}"

        if request.monitors:
            self._attach_peripherals(asset, request.monitors)

        self._log_event(
            asset,
            models.EventAction.status_changed,
            from_status=previous_status,
            to_status=models.AssetStatus.active,
        )
        if asset.location_id != previous_location and asset.location_id is not None:
            self._log_event(
                asset,
                models.EventAction.location_changed,
                from_location=previous_location,
                to_location=asset.location_id,
            )

    def _return_to_store(
        self,
        asset: models.Asset,
        target_location_id: str | None,
        notes: str | None,
    ) -> None:
        previous_status = asset.status
        previous_location = asset.location_id

        for assignment in asset.assignments:
            if assignment.end_date is None:
                assignment.end_date = datetime.utcnow()
                assignment.notes = (assignment.notes or "") + "\nAuto-closed on return."
                self._log_event(
                    asset,
                    models.EventAction.assignment_ended,
                    notes=f"Assignment {assignment.id} closed on return.",
                )

        asset.status = models.AssetStatus.spare
        if target_location_id:
            asset.location_id = target_location_id
        if notes:
            asset.notes = (asset.notes or "") + f"\n{notes}"

        for relationship in list(asset.relationships):
            child = relationship.child
            if child:
                previous_child_status = child.status
                child.status = models.AssetStatus.spare
                child.location_id = target_location_id or child.location_id
                self._log_event(
                    child,
                    models.EventAction.status_changed,
                    from_status=previous_child_status,
                    to_status=models.AssetStatus.spare,
                    notes="Peripheral returned with primary asset.",
                )
            self.db.delete(relationship)

        self._log_event(
            asset,
            models.EventAction.status_changed,
            from_status=previous_status,
            to_status=models.AssetStatus.spare,
        )
        if asset.location_id != previous_location:
            self._log_event(
                asset,
                models.EventAction.location_changed,
                from_location=previous_location,
                to_location=asset.location_id,
            )

    def _mark_repair(self, asset: models.Asset, notes: str | None) -> None:
        previous_status = asset.status
        asset.status = models.AssetStatus.repair
        if notes:
            asset.notes = (asset.notes or "") + f"\n{notes}"
        self._log_event(
            asset,
            models.EventAction.status_changed,
            from_status=previous_status,
            to_status=models.AssetStatus.repair,
        )

    def _retire(self, asset: models.Asset, notes: str | None) -> None:
        previous_status = asset.status
        asset.status = models.AssetStatus.retired
        asset.operation_state = models.OperationState.decommissioned
        if notes:
            asset.notes = (asset.notes or "") + f"\n{notes}"
        self._log_event(
            asset,
            models.EventAction.status_changed,
            from_status=previous_status,
            to_status=models.AssetStatus.retired,
        )

    def _move(self, asset: models.Asset, location_id: str, notes: str | None) -> None:
        previous_location = asset.location_id
        asset.location_id = location_id
        if notes:
            asset.notes = (asset.notes or "") + f"\n{notes}"
        self._log_event(
            asset,
            models.EventAction.location_changed,
            from_location=previous_location,
            to_location=asset.location_id,
        )

    def _log_event(
        self,
        asset: models.Asset,
        action: models.EventAction,
        *,
        from_status: models.AssetStatus | None = None,
        to_status: models.AssetStatus | None = None,
        from_location: str | None = None,
        to_location: str | None = None,
        notes: str | None = None,
    ) -> None:
        event = models.AssetEvent(
            asset_id=asset.id,
            action=action,
            actor=self.actor,
            from_status=from_status,
            to_status=to_status,
            from_location=from_location,
            to_location=to_location,
            notes=notes,
        )
        self.db.add(event)

    def _attach_peripherals(self, asset: models.Asset, peripherals: list[str]) -> None:
        monitor_query = select(models.Asset).where(models.Asset.id.in_(peripherals))
        monitors = self.db.execute(monitor_query).scalars().all()

        missing = set(peripherals) - {monitor.id for monitor in monitors}
        if missing:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Peripheral asset(s) not found: {', '.join(missing)}",
            )

        for monitor in monitors:
            existing = [
                rel
                for rel in asset.relationships
                if rel.child_asset_id == monitor.id
                and rel.relation_type == models.RelationType.peripheral_of
            ]
            if existing:
                continue
            relationship = models.AssetRelationship(
                parent_asset_id=asset.id,
                child_asset_id=monitor.id,
                relation_type=models.RelationType.peripheral_of,
            )
            monitor.status = models.AssetStatus.active
            monitor.location_id = asset.location_id
            self.db.add(relationship)
            asset.relationships.append(relationship)
            self._log_event(
                monitor,
                models.EventAction.status_changed,
                from_status=models.AssetStatus.spare,
                to_status=models.AssetStatus.active,
            )
