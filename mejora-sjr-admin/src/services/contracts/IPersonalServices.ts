import type { IDepartamentoConsultaService } from './IDepartamentoConsultaService';
import type { IEmpleadoConsultaService } from './IEmpleadoConsultaService';
import type { IEmpleadoGestionService } from './IEmpleadoGestionService';

/** Dependencias ensambladas; cada consumidor recibe solo su parte. */
export interface IPersonalServices {
  consulta: IEmpleadoConsultaService;
  gestion: IEmpleadoGestionService;
  departamentos: IDepartamentoConsultaService;
}
