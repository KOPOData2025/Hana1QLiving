import logging
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .vector_sync_service import VectorDBSyncService

logger = logging.getLogger(__name__)

class SchedulerService:

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.vector_sync_service = VectorDBSyncService()

    def start_scheduler(self):
        try:
            self.scheduler.add_job(
                func=self._sync_vector_db_job,
                trigger=CronTrigger(hour=2, minute=0),
                id="vector_db_sync",
                name="벡터DB 일일 동기화",
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("스케줄러 시작")

        except Exception as e:
            logger.error(f"스케줄러 시작 실패: {e}")

    def stop_scheduler(self):
        try:
            if self.scheduler.running:
                self.scheduler.shutdown()
                logger.info("스케줄러 중지됨")
        except Exception as e:
            logger.error(f"스케줄러 중지 실패: {e}")

    async def _sync_vector_db_job(self):
        try:
            logger.info("벡터DB 동기화 작업 시작")
            result = await self.vector_sync_service.sync_all_tables()

            logger.info(f"벡터DB 동기화 완료: 성공 {result['total_success']}개, 실패 {result['total_failed']}개")

            if result["errors"]:
                logger.warning(f"동기화 오류: {result['errors']}")

        except Exception as e:
            logger.error(f"벡터DB 동기화 작업 실패: {e}")

    async def manual_sync(self) -> dict:
        logger.info("수동 벡터DB 동기화 시작")
        return await self.vector_sync_service.sync_all_tables()

    def get_scheduler_status(self) -> dict:
        try:
            jobs = []
            if self.scheduler.running:
                for job in self.scheduler.get_jobs():
                    jobs.append({
                        "id": job.id,
                        "name": job.name,
                        "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                        "trigger": str(job.trigger)
                    })

            return {
                "running": self.scheduler.running,
                "jobs": jobs,
                "current_time": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "running": False,
                "error": str(e),
                "current_time": datetime.now().isoformat()
            }